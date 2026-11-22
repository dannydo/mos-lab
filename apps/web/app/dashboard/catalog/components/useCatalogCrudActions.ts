'use client';

import { useState } from 'react';
import { Form, message } from 'antd';
import type {
  CatalogProduct,
  CatalogService,
  CatalogServicePrice,
  SafeAny,
  ServiceLiveComboCheckResult,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { inferLashCount, inferLashStyle } from './catalogHelpers';

interface PendingDeactivateTarget {
  type: 'toggle' | 'save' | 'delete';
  id: number;
  values?: SafeAny;
  currentDisabled?: boolean;
  serviceName?: string;
}

interface UseCatalogCrudActionsParams {
  services: CatalogService[];
  fetchServices: () => Promise<void>;
  fetchCombos: () => Promise<void>;
  fetchProducts: () => Promise<void>;
}

export function useCatalogCrudActions({
  services,
  fetchServices,
  fetchCombos,
  fetchProducts,
}: UseCatalogCrudActionsParams) {
  const [saving, setSaving] = useState(false);

  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<CatalogService | null>(null);

  const [liveComboModalOpen, setLiveComboModalOpen] = useState(false);
  const [liveComboCheckData, setLiveComboCheckData] = useState<ServiceLiveComboCheckResult | null>(null);
  const [pendingDeactivateTarget, setPendingDeactivateTarget] = useState<PendingDeactivateTarget | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const [comboDrawerOpen, setComboDrawerOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<CatalogServicePrice | null>(null);

  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);

  const [serviceForm] = Form.useForm();
  const [comboForm] = Form.useForm();
  const [productForm] = Form.useForm();

  const openLiveComboModal = (data: ServiceLiveComboCheckResult, target: PendingDeactivateTarget) => {
    setLiveComboCheckData(data);
    setPendingDeactivateTarget(target);
    setLiveComboModalOpen(true);
  };

  const resetDeactivateModal = () => {
    setLiveComboModalOpen(false);
    setLiveComboCheckData(null);
    setPendingDeactivateTarget(null);
  };

  const checkLiveCombosBeforeDeactivate = async (id: number, target: PendingDeactivateTarget): Promise<boolean> => {
    try {
      const checkRes = await apiClient.catalog.checkServiceLiveCombos(id);
      if (checkRes.data && checkRes.data.totalOwners > 0) {
        openLiveComboModal(checkRes.data, target);
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const handleOpenServiceDrawer = (record?: CatalogService) => {
    if (record) {
      setEditingService(record);
      const firstPrice = record.prices && record.prices.length > 0 ? record.prices[0].servicePrice : undefined;
      const isProduct =
        record.serviceGroup === 'Product' ||
        record.serviceType === 'Product' ||
        record.serviceKey === 'any-service-product';
      serviceForm.setFieldsValue({
        serviceName: record.serviceName,
        serviceKey: record.serviceKey,
        serviceGroup: record.serviceGroup,
        serviceType: record.serviceType,
        lashStyle: isProduct
          ? undefined
          : record.lashStyle || inferLashStyle(record.serviceKey, record.serviceName) || undefined,
        lashCount: isProduct
          ? undefined
          : record.lashCount || inferLashCount(record.serviceKey, record.serviceName) || undefined,
        durationMinute: record.durationMinute,
        durationMinuteStandard: record.durationMinuteStandard || record.durationMinute,
        remindingIntervalDay: record.remindingIntervalDay,
        servicePrice: firstPrice,
        serviceDescription: record.serviceDescription,
      });
    } else {
      setEditingService(null);
      serviceForm.resetFields();
      serviceForm.setFieldsValue({
        serviceGroup: 'LashesTop',
        serviceType: 'Normal',
        lashStyle: 'Classic',
        lashCount: 80,
        durationMinute: 60,
        durationMinuteStandard: 60,
        remindingIntervalDay: 21,
      });
    }
    setServiceDrawerOpen(true);
  };

  const handleSaveService = async (values: SafeAny, forceConfirm = false) => {
    setSaving(true);
    try {
      if (editingService) {
        if (values.isDisabled && !forceConfirm) {
          const blocked = await checkLiveCombosBeforeDeactivate(editingService.id, {
            type: 'save',
            id: editingService.id,
            values,
            serviceName: editingService.serviceName,
          });
          if (blocked) {
            setSaving(false);
            return;
          }
        }
        await apiClient.catalog.updateService(editingService.id, { ...values, confirm: forceConfirm });
        message.success('Cập nhật dịch vụ thành công');
      } else {
        await apiClient.catalog.createService(values);
        message.success('Tạo dịch vụ mới thành công');
      }
      setServiceDrawerOpen(false);
      fetchServices();
    } catch (err: SafeAny) {
      if (err.response?.data?.code === 'LIVE_COMBOS_DETECTED' && err.response?.data?.data) {
        openLiveComboModal(err.response.data.data, {
          type: 'save',
          id: editingService?.id || 0,
          values,
          serviceName: editingService?.serviceName,
        });
      } else {
        message.error('Lỗi khi lưu dịch vụ');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleServiceStatus = async (id: number, currentDisabled: boolean, forceConfirm = false) => {
    const targetName = services.find((s) => s.id === id)?.serviceName;

    if (!currentDisabled && !forceConfirm) {
      const blocked = await checkLiveCombosBeforeDeactivate(id, {
        type: 'toggle',
        id,
        currentDisabled,
        serviceName: targetName,
      });
      if (blocked) return;
    }

    try {
      await apiClient.catalog.updateService(id, { isDisabled: !currentDisabled, confirm: forceConfirm });
      message.success(currentDisabled ? 'Đã kích hoạt dịch vụ' : 'Đã vô hiệu hóa dịch vụ');
      fetchServices();
    } catch (err: SafeAny) {
      if (err.response?.data?.code === 'LIVE_COMBOS_DETECTED' && err.response?.data?.data) {
        openLiveComboModal(err.response.data.data, {
          type: 'toggle',
          id,
          currentDisabled,
          serviceName: targetName,
        });
      } else {
        message.error('Lỗi khi đổi trạng thái dịch vụ');
      }
    }
  };

  const handleDeleteService = async (id: number, forceConfirm = false) => {
    const targetName = services.find((s) => s.id === id)?.serviceName;

    if (!forceConfirm) {
      const blocked = await checkLiveCombosBeforeDeactivate(id, {
        type: 'delete',
        id,
        serviceName: targetName,
      });
      if (blocked) return;
    }

    try {
      await apiClient.catalog.deleteService(id, forceConfirm);
      message.success('Đã vô hiệu hóa dịch vụ');
      fetchServices();
    } catch (err: SafeAny) {
      if (err.response?.data?.code === 'LIVE_COMBOS_DETECTED' && err.response?.data?.data) {
        openLiveComboModal(err.response.data.data, {
          type: 'delete',
          id,
          serviceName: targetName,
        });
      } else {
        message.error('Lỗi khi vô hiệu hóa dịch vụ');
      }
    }
  };

  const handleConfirmDeactivateModal = async () => {
    if (!pendingDeactivateTarget) return;
    setDeactivateLoading(true);
    try {
      const { type, id, values, currentDisabled } = pendingDeactivateTarget;
      if (type === 'save' && values) {
        await handleSaveService(values, true);
      } else if (type === 'toggle') {
        await handleToggleServiceStatus(id, currentDisabled || false, true);
      } else if (type === 'delete') {
        await handleDeleteService(id, true);
      }
      resetDeactivateModal();
    } catch {
      message.error('Lỗi khi ngưng hoạt động dịch vụ');
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleComboValuesChange = (changedValues: SafeAny, allValues: SafeAny) => {
    if (changedValues.serviceId || changedValues.normalCount !== undefined || changedValues.retainCount !== undefined) {
      const selectedService = services.find((s) => s.id === allValues.serviceId);
      if (selectedService && selectedService.prices && selectedService.prices.length > 0) {
        const retailPrice = selectedService.prices[0].servicePrice || 0;
        const buyNormal = allValues.normalCount || 0;
        const calculatedPrice = Math.round(retailPrice * buyNormal);
        if (calculatedPrice > 0) {
          comboForm.setFieldsValue({ servicePrice: calculatedPrice });
        }
      }
    }
  };

  const handleOpenComboDrawer = (record?: CatalogServicePrice) => {
    if (record) {
      setEditingCombo(record);
      comboForm.setFieldsValue({
        serviceId: record.serviceId,
        servicePricePackageKey: record.servicePricePackageKey,
        servicePriceType: record.servicePriceType,
        servicePrice: record.servicePrice,
        normalCount: record.normalCount,
        bonusNormalCount: record.bonusNormalCount || 0,
        retainCount: record.retainCount,
        bonusRetainCount: record.bonusRetainCount || 0,
        expiryAfterDay: record.expiryAfterDay,
      });
    } else {
      setEditingCombo(null);
      comboForm.resetFields();
      comboForm.setFieldsValue({
        servicePriceType: 'Combo',
        normalCount: 7,
        bonusNormalCount: 3,
        retainCount: 0,
        bonusRetainCount: 0,
        expiryAfterDay: 180,
        servicePrice: 2000000,
      });
    }
    setComboDrawerOpen(true);
  };

  const handleSaveCombo = async (values: SafeAny) => {
    setSaving(true);
    try {
      const perNormalPrice =
        values.normalCount > 0
          ? Math.round(values.servicePrice / (values.normalCount + values.retainCount))
          : values.servicePrice;
      const perRetainPrice = perNormalPrice;

      const payload = {
        ...values,
        servicePriceType: 'Combo',
        perNormalPrice,
        perRetainPrice,
      };

      if (editingCombo) {
        await apiClient.catalog.updateCombo(editingCombo.id, payload);
        message.success('Cập nhật gói combo thành công');
      } else {
        await apiClient.catalog.createCombo(payload);
        message.success('Tạo gói combo mới thành công');
      }
      setComboDrawerOpen(false);
      fetchCombos();
    } catch (err: SafeAny) {
      message.error(err?.response?.data?.error || 'Lỗi khi lưu gói combo');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComboStatus = async (id: number, currentDisabled: boolean) => {
    try {
      await apiClient.catalog.updateCombo(id, { isDisabled: !currentDisabled });
      message.success(currentDisabled ? 'Đã kích hoạt gói combo' : 'Đã vô hiệu hóa gói combo');
      fetchCombos();
    } catch {
      message.error('Lỗi khi đổi trạng thái gói combo');
    }
  };

  const handleDeleteCombo = async (id: number) => {
    try {
      await apiClient.catalog.deleteCombo(id);
      message.success('Đã vô hiệu hóa gói combo');
      fetchCombos();
    } catch {
      message.error('Lỗi khi vô hiệu hóa gói combo');
    }
  };

  const handleOpenProductDrawer = (record?: CatalogProduct) => {
    if (record) {
      setEditingProduct(record);
      productForm.setFieldsValue({
        productName: record.productName,
        productSku: record.productSku,
        productPrice: record.productPrice,
        productDescription: record.productDescription,
      });
    } else {
      setEditingProduct(null);
      productForm.resetFields();
    }
    setProductDrawerOpen(true);
  };

  const handleSaveProduct = async (values: SafeAny) => {
    setSaving(true);
    try {
      if (editingProduct) {
        await apiClient.catalog.updateProduct(editingProduct.id, values);
        message.success('Cập nhật sản phẩm thành công');
      } else {
        await apiClient.catalog.createProduct(values);
        message.success('Tạo sản phẩm mới thành công');
      }
      setProductDrawerOpen(false);
      fetchProducts();
    } catch {
      message.error('Lỗi khi lưu sản phẩm');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleProductStatus = async (id: number, currentDisabled: boolean) => {
    try {
      await apiClient.catalog.updateProduct(id, { isDisabled: !currentDisabled });
      message.success(currentDisabled ? 'Đã kích hoạt sản phẩm' : 'Đã vô hiệu hóa sản phẩm');
      fetchProducts();
    } catch {
      message.error('Lỗi khi đổi trạng thái sản phẩm');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      await apiClient.catalog.deleteProduct(id);
      message.success('Đã vô hiệu hóa sản phẩm');
      fetchProducts();
    } catch {
      message.error('Lỗi khi vô hiệu hóa sản phẩm');
    }
  };

  return {
    saving,
    serviceForm,
    comboForm,
    productForm,
    serviceDrawerOpen,
    setServiceDrawerOpen,
    editingService,
    comboDrawerOpen,
    setComboDrawerOpen,
    editingCombo,
    productDrawerOpen,
    setProductDrawerOpen,
    editingProduct,
    liveComboModalOpen,
    liveComboCheckData,
    pendingDeactivateTarget,
    deactivateLoading,
    resetDeactivateModal,
    handleOpenServiceDrawer,
    handleSaveService,
    handleToggleServiceStatus,
    handleDeleteService,
    handleConfirmDeactivateModal,
    handleComboValuesChange,
    handleOpenComboDrawer,
    handleSaveCombo,
    handleToggleComboStatus,
    handleDeleteCombo,
    handleOpenProductDrawer,
    handleSaveProduct,
    handleToggleProductStatus,
    handleDeleteProduct,
  };
}
