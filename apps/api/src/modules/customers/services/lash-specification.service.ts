import { FastifyInstance } from 'fastify';
import { LashSpecification } from '@mos-lab/shared';

interface RawOrderServiceRow {
  orderServiceId: number | bigint;
  orderId: number | bigint;
  serviceId: number | bigint;
  attributeGroupKey: string | null;
  serviceName: string | null;
}

interface RawAttributeValueRow {
  groupKey: string | null;
  itemGroupId: string | null;
  attributeId: number | bigint;
  val: string | null;
}

export class LashSpecificationService {
  /**
   * Fetches lash technical specifications (Dáng mi, Độ cong, Độ dày, Độ dài, Số sợi, Fan, Màu)
   * for a given list of order IDs from legacy database tables (order_service, item_attribute_value,
   * attribute, attribute_option_language).
   */
  static async getLashSpecsByOrderIds(
    fastify: FastifyInstance,
    orderIds: number[]
  ): Promise<Map<number, LashSpecification[]>> {
    const resultByOrderId = new Map<number, LashSpecification[]>();
    const validOrderIds = Array.from(
      new Set(orderIds.filter((id) => typeof id === 'number' && Number.isFinite(id) && id > 0))
    );

    if (validOrderIds.length === 0) {
      return resultByOrderId;
    }

    // 1. Fetch order services that have an attribute_group_key
    const orderServices = await fastify.prisma.legacy.$queryRawUnsafe<RawOrderServiceRow[]>(`
      SELECT 
        os.id as orderServiceId,
        os.order_id as orderId,
        os.service_id as serviceId,
        os.attribute_group_key as attributeGroupKey,
        COALESCE(sl.service_name, s.service_key) as serviceName
      FROM order_service os
      LEFT JOIN service s ON os.service_id = s.id
      LEFT JOIN service_language sl ON os.service_id = sl.service_id AND sl.language_id = 1
      WHERE os.order_id IN (${validOrderIds.join(',')})
        AND os.attribute_group_key IS NOT NULL 
        AND os.attribute_group_key != ''
      ORDER BY os.order_id ASC, os.id ASC
    `);

    if (!orderServices || orderServices.length === 0) {
      return resultByOrderId;
    }

    const groupKeys = Array.from(
      new Set(
        orderServices.map((os) => (os.attributeGroupKey ? String(os.attributeGroupKey).trim() : '')).filter(Boolean)
      )
    );

    if (groupKeys.length === 0) {
      return resultByOrderId;
    }

    // Escape groupKeys safely for SQL IN clause
    const escapedGroupKeys = groupKeys.map((k) => `'${k.replace(/'/g, "''")}'`).join(',');

    // 2. Fetch technical attribute values:
    // Attribute IDs:
    //  9: Độ cong (extension-curl)
    // 10: Dáng mi (design)
    // 11: Độ dài (extension-lash-length)
    // 12: Số sợi (extension-lash-count)
    // 13: Fan (volume)
    // 14: Màu (extension-lash-color)
    // 15: Độ dày (extension-lash-thickness)
    const attrRows = await fastify.prisma.legacy.$queryRawUnsafe<RawAttributeValueRow[]>(`
      SELECT 
        iav.group_key as groupKey,
        iav.item_group_id as itemGroupId,
        iav.attribute_id as attributeId,
        COALESCE(NULLIF(aol2.attribute_option_value, ''), NULLIF(aol1.attribute_option_value, ''), NULLIF(iav.attribute_option_value, '')) as val
      FROM item_attribute_value iav
      JOIN attribute a ON iav.attribute_id = a.id
      LEFT JOIN attribute_option_language aol1 ON iav.attribute_option_id = aol1.attribute_option_id AND aol1.language_id = 1
      LEFT JOIN attribute_option_language aol2 ON iav.attribute_option_id = aol2.attribute_option_id AND aol2.language_id = 2
      WHERE iav.group_key IN (${escapedGroupKeys})
        AND iav.attribute_id IN (9, 10, 11, 12, 13, 14, 15)
      ORDER BY iav.id ASC
    `);

    // Group attribute rows by groupKey + itemGroupId
    const attrMap = new Map<string, RawAttributeValueRow[]>();
    for (const row of attrRows) {
      const gKey = String(row.groupKey || '');
      const itemGId = row.itemGroupId ? String(row.itemGroupId) : '';
      const key = `${gKey}_${itemGId}`;
      const list = attrMap.get(key) || [];
      list.push(row);
      attrMap.set(key, list);

      // Fallback key: groupKey without itemGroupId
      const fallbackKey = `${gKey}_`;
      const fallbackList = attrMap.get(fallbackKey) || [];
      fallbackList.push(row);
      attrMap.set(fallbackKey, fallbackList);
    }

    for (const os of orderServices) {
      const orderId = Number(os.orderId);
      const serviceId = Number(os.serviceId);
      const gKey = String(os.attributeGroupKey || '');
      const keyWithItem = `${gKey}_${serviceId}`;

      let matchingAttrs = attrMap.get(keyWithItem);
      if (!matchingAttrs || matchingAttrs.length === 0) {
        matchingAttrs = attrMap.get(`${gKey}_`);
      }

      if (!matchingAttrs || matchingAttrs.length === 0) continue;

      const styles: string[] = [];
      const curls: string[] = [];
      const thicknesses: string[] = [];
      const lengths: string[] = [];
      const counts: string[] = [];
      const fans: string[] = [];
      const colors: string[] = [];

      for (const a of matchingAttrs) {
        // If matchingAttrs came from fallback, ensure we don't bleed across sibling services
        if (a.itemGroupId && Number(a.itemGroupId) !== serviceId && matchingAttrs === attrMap.get(`${gKey}_`)) {
          const siblings = orderServices.filter(
            (s) => Number(s.orderId) === orderId && String(s.attributeGroupKey) === gKey
          );
          if (siblings.length > 1) continue;
        }

        const val = (a.val || '').trim();
        if (!val) continue;
        const attrId = Number(a.attributeId);

        if (attrId === 10 && !styles.includes(val)) styles.push(val);
        if (attrId === 9 && !curls.includes(val)) curls.push(val);
        if (attrId === 15 && !thicknesses.includes(val)) thicknesses.push(val);
        if (attrId === 11 && !lengths.includes(val)) lengths.push(val);
        if (attrId === 12 && !counts.includes(val)) counts.push(val);
        if (attrId === 13 && !fans.includes(val)) fans.push(val);
        if (attrId === 14 && !colors.includes(val)) colors.push(val);
      }

      // Sort lengths numerically if valid numbers, otherwise alphabetically
      lengths.sort((x, y) => {
        const nx = parseFloat(x);
        const ny = parseFloat(y);
        return !isNaN(nx) && !isNaN(ny) ? nx - ny : x.localeCompare(y);
      });

      // Only add specification if at least one lash metric is present
      if (
        styles.length === 0 &&
        curls.length === 0 &&
        thicknesses.length === 0 &&
        lengths.length === 0 &&
        counts.length === 0 &&
        fans.length === 0 &&
        colors.length === 0
      ) {
        continue;
      }

      const spec: LashSpecification = {
        serviceId,
        serviceName: os.serviceName || undefined,
        style: styles.length > 0 ? styles.join(', ') : null,
        curl: curls.length > 0 ? curls.join(', ') : null,
        thickness: thicknesses.length > 0 ? thicknesses.join(', ') : null,
        length: lengths.length > 0 ? lengths.join(', ') : null,
        strandCount: counts.length > 0 ? counts.join(', ') : null,
        fan: fans.length > 0 ? fans.join(', ') : null,
        color: colors.length > 0 ? colors.join(', ') : null,
      };

      const orderSpecs = resultByOrderId.get(orderId) || [];
      orderSpecs.push(spec);
      resultByOrderId.set(orderId, orderSpecs);
    }

    return resultByOrderId;
  }
}
