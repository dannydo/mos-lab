'use client';

import React, { useRef } from 'react';
import { Alert, Button, Card, Result, Select, Space, Tabs, Tooltip, message, theme as antdTheme } from 'antd';
import {
  AppstoreOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  ProjectOutlined,
  ShopOutlined,
  TagOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { RotateCcw, ShoppingBag } from 'lucide-react';
import { type CatalogItemType } from '@mos-lab/shared';
import { AppIcon, IconButton, PageHeader, ReportPeriodNavigator, SearchField } from '../../../components/ui';
import CatalogReportHeader from './components/CatalogReportHeader';
import CatalogLeaderboardCard from './components/CatalogLeaderboardCard';
import CatalogItemDetailPanel from './components/CatalogItemDetailPanel';
import CatalogComboLiveTab from './components/CatalogComboLiveTab';
import CatalogComboConsultTab from './components/CatalogComboConsultTab';
import CatalogBenchmarkTab from './components/CatalogBenchmarkTab';
import CatalogBranchTab from './components/CatalogBranchTab';
import { ServiceDeactivateConfirmModal } from './components/ServiceDeactivateConfirmModal';
import { type CatalogFilterItemType, type CatalogViewMode } from './components/catalogHelpers';
import { buildComboColumns, buildProductColumns, buildServiceColumns } from './components/catalogTableColumns';
import { useCatalogCrudActions } from './components/useCatalogCrudActions';
import { useCatalogPageState } from './components/useCatalogPageState';
import {
  CatalogCombosTabPane,
  CatalogProductsTabPane,
  CatalogServicesTabPane,
} from './components/CatalogManagementTabs';
import { CatalogComboDrawer, CatalogProductDrawer, CatalogServiceDrawer } from './components/CatalogFormDrawers';
import catalogStyles from './catalog.module.css';

export type { CatalogFilterItemType, CatalogViewMode };

const REPORT_TYPE_OPTIONS = [
  { value: 'all', label: 'Tất cả loại' },
  { value: 'service', label: 'Dịch vụ' },
  { value: 'combo', label: 'Gói Combo' },
  { value: 'product', label: 'Sản phẩm' },
];

export default function CatalogPage() {
  const { token } = antdTheme.useToken();
  const openBranchCreateRef = useRef<(() => void) | null>(null);
  const state = useCatalogPageState();

  const crud = useCatalogCrudActions({
    services: state.services,
    fetchServices: state.fetchServices,
    fetchCombos: state.fetchCombos,
    fetchProducts: state.fetchProducts,
  });

  if (state.isAdmin === null) return null;
  if (!state.isAdmin) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="Xin lỗi, bạn không có quyền truy cập trang này."
        extra={
          <Button type="primary" href="/dashboard">
            Về trang chủ
          </Button>
        }
      />
    );
  }

  const handleEditItemFromDetail = (itemId: number, itemType: CatalogItemType) => {
    if (itemType === 'service') {
      const target = state.services.find((s) => s.id === itemId);
      if (target) {
        state.setActiveTab('services');
        crud.handleOpenServiceDrawer(target);
      } else {
        message.info('Vui lòng mở tab Dịch vụ bên dưới để chỉnh sửa');
      }
    } else if (itemType === 'combo') {
      const target = state.combos.find((c) => c.id === itemId);
      if (target) {
        state.setActiveTab('combos');
        crud.handleOpenComboDrawer(target);
      } else {
        message.info('Vui lòng mở tab Combo bên dưới để chỉnh sửa');
      }
    } else {
      const target = state.products.find((p) => p.id === itemId);
      if (target) {
        state.setActiveTab('products');
        crud.handleOpenProductDrawer(target);
      } else {
        message.info('Vui lòng mở tab Sản phẩm bên dưới để chỉnh sửa');
      }
    }
  };

  const handleToggleStatusFromDetail = async (itemId: number, itemType: CatalogItemType, currentDisabled: boolean) => {
    if (itemType === 'service') {
      await crud.handleToggleServiceStatus(itemId, currentDisabled);
    } else if (itemType === 'combo') {
      await crud.handleToggleComboStatus(itemId, currentDisabled);
    } else {
      await crud.handleToggleProductStatus(itemId, currentDisabled);
    }
    state.fetchReportSummary();
    if (state.selectedLeaderboardItem) {
      state.fetchItemHistory(state.selectedLeaderboardItem);
    }
  };

  const serviceColumns = buildServiceColumns({
    onToggleStatus: (id, disabled) => crud.handleToggleServiceStatus(id, disabled),
    onOpenDrawer: crud.handleOpenServiceDrawer,
    onDelete: (id) => crud.handleDeleteService(id),
  });

  const comboColumns = buildComboColumns({
    onToggleStatus: crud.handleToggleComboStatus,
    onOpenDrawer: crud.handleOpenComboDrawer,
    onDelete: crud.handleDeleteCombo,
  });

  const productColumns = buildProductColumns({
    onToggleStatus: crud.handleToggleProductStatus,
    onOpenDrawer: crud.handleOpenProductDrawer,
    onDelete: crud.handleDeleteProduct,
  });

  return (
    <div className={`responsive-page responsive-workspace catalog-page ${catalogStyles.page}`}>
      <PageHeader
        title="Quản lý Catalog"
        subtitle="Báo cáo doanh số & Quản lý danh mục Dịch vụ, Gói Combo, và Sản phẩm"
        icon={<AppIcon icon={ShoppingBag} size="lg" />}
        className={catalogStyles.header}
        extra={
          <div className={catalogStyles.reportControls}>
            <ReportPeriodNavigator
              mode={state.viewMode}
              value={state.referenceDate}
              label={state.getPeriodLabel()}
              onModeChange={state.handleViewModeChange}
              onPrevious={() => state.handleNavigateDate(-1)}
              onNext={() => state.handleNavigateDate(1)}
              onValueChange={state.handleDateValueChange}
            />
            <IconButton label="Quay về kỳ hiện tại" icon={RotateCcw} onClick={state.handleToday} />

            {state.activeTab === 'report' && (
              <div className={catalogStyles.reportFilters}>
                <Select
                  aria-label="Lọc loại dữ liệu báo cáo"
                  className={catalogStyles.reportTypeSelect}
                  value={state.reportItemType}
                  onChange={(val) => state.handleReportItemTypeChange(val as CatalogFilterItemType)}
                  options={REPORT_TYPE_OPTIONS}
                />
                <SearchField
                  behavior="filter"
                  aria-label="Tìm dữ liệu báo cáo"
                  className={catalogStyles.reportSearch}
                  placeholder="Tìm kiếm..."
                  value={state.reportSearch}
                  onChange={(event) => state.handleReportSearchChange(event.target.value)}
                  allowClear
                />
              </div>
            )}

            {state.isCatalogAdmin && state.activeTab === 'services' && (
              <Tooltip title="Thêm dịch vụ mới">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => crud.handleOpenServiceDrawer()} />
              </Tooltip>
            )}
            {state.isCatalogAdmin && state.activeTab === 'combos' && (
              <Tooltip title="Thêm gói combo mới">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => crud.handleOpenComboDrawer()} />
              </Tooltip>
            )}
            {state.isCatalogAdmin && state.activeTab === 'products' && (
              <Tooltip title="Thêm sản phẩm mới">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => crud.handleOpenProductDrawer()} />
              </Tooltip>
            )}
            {state.isCatalogAdmin && state.activeTab === 'branches' && (
              <Tooltip title="Thêm chi nhánh mới">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openBranchCreateRef.current?.()} />
              </Tooltip>
            )}
          </div>
        }
      />

      {!state.isCatalogAdmin && (
        <Alert
          type="info"
          showIcon
          message="Phân quyền Quản lý Catalog"
          description="Chỉ tài khoản Quản trị viên (Admin / Super Admin) mới có quyền Thêm, Sửa, Xóa dữ liệu Catalog. Bạn đang xem ở chế độ Read-only."
          className="mb-4 rounded-xl"
        />
      )}

      <Card
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        className={`shadow-sm rounded-xl dashboard-main-tabs-card ${catalogStyles.tabsCard}`}
      >
        <Tabs
          activeKey={state.activeTab}
          onChange={state.handleTabChange}
          size="large"
          destroyOnHidden
          animated={{ inkBar: true, tabPane: true }}
          items={[
            {
              key: 'report',
              label: (
                <Space>
                  <TrophyOutlined className="text-amber-500" />
                  <span>Báo cáo & Leaderboard</span>
                </Space>
              ),
              children: (
                <div className={`${catalogStyles.tabPane} space-y-4`}>
                  <CatalogReportHeader summary={state.reportSummary} loading={state.loadingReport} />
                  <CatalogLeaderboardCard
                    leaderboard={state.reportSummary?.leaderboard || []}
                    loading={state.loadingReport}
                    selectedItem={state.selectedLeaderboardItem}
                    page={state.leaderboardPage}
                    pageSize={state.leaderboardPageSize}
                    onPageChange={state.handleLeaderboardPageChange}
                    onSelectItem={(item) => {
                      if (
                        state.selectedLeaderboardItem?.itemId === item.itemId &&
                        state.selectedLeaderboardItem?.itemType === item.itemType
                      ) {
                        state.setSelectedLeaderboardItem(null);
                      } else {
                        state.setSelectedLeaderboardItem(item);
                      }
                    }}
                  />
                  {state.selectedLeaderboardItem && (
                    <div className="mt-6 pt-2">
                      <CatalogItemDetailPanel
                        selectedItem={state.selectedLeaderboardItem}
                        historyData={state.itemHistoryData}
                        loading={state.loadingItemHistory}
                        onClose={() => state.setSelectedLeaderboardItem(null)}
                        onEditItem={handleEditItemFromDetail}
                        onToggleStatus={handleToggleStatusFromDetail}
                      />
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'services',
              label: (
                <Space>
                  <AppstoreOutlined />
                  <span>Dịch vụ</span>
                </Space>
              ),
              children: (
                <CatalogServicesTabPane
                  tabPaneClassName={catalogStyles.tabPane}
                  services={state.services}
                  loadingServices={state.loadingServices}
                  showDisabled={state.showDisabled}
                  serviceSearch={state.serviceSearch}
                  serviceGroupFilter={state.serviceGroupFilter}
                  serviceTypeFilter={state.serviceTypeFilter}
                  servicePage={state.servicePage}
                  servicePageSize={state.servicePageSize}
                  columns={serviceColumns}
                  onSearchChange={(val) => {
                    state.setServiceSearch(val);
                    state.setServicePage(1);
                    localStorage.setItem('catalog_service_page', '1');
                  }}
                  onGroupFilterChange={(val) => {
                    state.setServiceGroupFilter(val);
                    state.setServicePage(1);
                    localStorage.setItem('catalog_service_page', '1');
                  }}
                  onTypeFilterChange={(val) => {
                    state.setServiceTypeFilter(val);
                    state.setServicePage(1);
                    localStorage.setItem('catalog_service_page', '1');
                  }}
                  onShowDisabledChange={(checked) => {
                    state.handleShowDisabledChange(checked);
                    state.setServicePage(1);
                  }}
                  onPageChange={state.handleServicePageChange}
                />
              ),
            },
            {
              key: 'combos',
              label: (
                <Space>
                  <ProjectOutlined />
                  <span>Gói Combo</span>
                </Space>
              ),
              children: (
                <CatalogCombosTabPane
                  tabPaneClassName={catalogStyles.tabPane}
                  combos={state.combos}
                  loadingCombos={state.loadingCombos}
                  showDisabled={state.showDisabled}
                  comboPage={state.comboPage}
                  comboPageSize={state.comboPageSize}
                  columns={comboColumns}
                  onShowDisabledChange={(checked) => {
                    state.handleShowDisabledChange(checked);
                    state.setComboPage(1);
                  }}
                  onPageChange={state.handleComboPageChange}
                />
              ),
            },
            {
              key: 'combo-consult',
              label: (
                <Space>
                  <TrophyOutlined className="text-amber-500" />
                  <span>💎 Bàn Tư Vấn 13 Dòng Mi</span>
                </Space>
              ),
              children: (
                <div className={`${catalogStyles.tabPane} space-y-4`}>
                  <CatalogComboConsultTab />
                </div>
              ),
            },
            {
              key: 'combo-live',
              label: (
                <Space>
                  <ThunderboltOutlined className="text-amber-400" />
                  <span>Combo Live</span>
                </Space>
              ),
              children: (
                <div className={`${catalogStyles.tabPane} space-y-4`}>
                  <CatalogComboLiveTab />
                </div>
              ),
            },
            {
              key: 'products',
              label: (
                <Space>
                  <TagOutlined />
                  <span>Sản phẩm</span>
                </Space>
              ),
              children: (
                <CatalogProductsTabPane
                  tabPaneClassName={catalogStyles.tabPane}
                  tabContentClassName={catalogStyles.tabContent}
                  listSearchClassName={catalogStyles.listSearch}
                  products={state.products}
                  loadingProducts={state.loadingProducts}
                  showDisabled={state.showDisabled}
                  productSearch={state.productSearch}
                  productPage={state.productPage}
                  productPageSize={state.productPageSize}
                  columns={productColumns}
                  onSearchChange={(val) => {
                    state.setProductSearch(val);
                    state.setProductPage(1);
                    localStorage.setItem('catalog_product_page', '1');
                  }}
                  onShowDisabledChange={(checked) => {
                    state.handleShowDisabledChange(checked);
                    state.setProductPage(1);
                  }}
                  onPageChange={state.handleProductPageChange}
                />
              ),
            },
            {
              key: 'benchmark',
              label: (
                <Space>
                  <ClockCircleOutlined className="text-purple-500" />
                  <span>Benchmark Mi</span>
                </Space>
              ),
              children: (
                <div className={catalogStyles.tabPane}>
                  <CatalogBenchmarkTab />
                </div>
              ),
            },
            {
              key: 'branches',
              label: (
                <Space>
                  <ShopOutlined className="text-blue-500" />
                  <span>Chi Nhánh</span>
                </Space>
              ),
              children: (
                <div className={catalogStyles.tabPane}>
                  <CatalogBranchTab
                    onRegisterCreate={(fn) => {
                      openBranchCreateRef.current = fn;
                    }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      <CatalogServiceDrawer
        open={crud.serviceDrawerOpen}
        saving={crud.saving}
        editingService={crud.editingService}
        form={crud.serviceForm}
        dynamicGroups={state.dynamicGroups}
        dynamicTypes={state.dynamicTypes}
        onClose={() => crud.setServiceDrawerOpen(false)}
        onFinish={(values) => crud.handleSaveService(values)}
      />

      <CatalogComboDrawer
        open={crud.comboDrawerOpen}
        saving={crud.saving}
        editingCombo={crud.editingCombo}
        form={crud.comboForm}
        services={state.services}
        onClose={() => crud.setComboDrawerOpen(false)}
        onFinish={crud.handleSaveCombo}
        onValuesChange={crud.handleComboValuesChange}
      />

      <CatalogProductDrawer
        open={crud.productDrawerOpen}
        saving={crud.saving}
        editingProduct={crud.editingProduct}
        form={crud.productForm}
        onClose={() => crud.setProductDrawerOpen(false)}
        onFinish={crud.handleSaveProduct}
      />

      <ServiceDeactivateConfirmModal
        open={crud.liveComboModalOpen}
        loading={crud.deactivateLoading}
        serviceName={crud.pendingDeactivateTarget?.serviceName}
        data={crud.liveComboCheckData}
        onCancel={crud.resetDeactivateModal}
        onConfirm={crud.handleConfirmDeactivateModal}
      />
    </div>
  );
}
