import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import App from './App';
import { ErrorBoundary } from './components/shared';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const nvidopiaTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#76B900',
    colorInfo: '#007AFF',
    colorSuccess: '#34C759',
    colorWarning: '#FF9500',
    colorError: '#FF3B30',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBgLayout: '#F5F5F7',
    colorBorder: '#D1D1D6',
    colorBorderSecondary: '#E5E5EA',
    colorText: '#1D1D1F',
    colorTextSecondary: '#6E6E73',
    colorTextTertiary: '#AEAEB2',
    colorTextQuaternary: '#C7C7CC',
    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
    fontSize: 14,
    controlHeight: 36,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#FFFFFF',
      siderBg: '#FFFFFF',
      bodyBg: '#F5F5F7',
      triggerBg: '#E5E5EA',
    },
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemSelectedBg: 'rgba(118, 185, 0, 0.08)',
      itemHoverBg: '#F0F0F2',
      itemColor: '#6E6E73',
      itemSelectedColor: '#76B900',
      itemBorderRadius: 10,
      itemMarginInline: 8,
      iconSize: 16,
    },
    Table: {
      headerBg: '#F5F5F7',
      headerColor: '#6E6E73',
      rowHoverBg: '#F0F0F2',
      borderColor: '#E5E5EA',
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
    },
    Card: {
      colorBgContainer: '#FFFFFF',
      colorBorderSecondary: '#E5E5EA',
    },
    Button: {
      primaryShadow: '0 2px 8px rgba(118, 185, 0, 0.20)',
      defaultBg: '#FFFFFF',
      defaultBorderColor: '#D1D1D6',
      borderRadius: 12,
      borderRadiusLG: 12,
    },
    Input: {
      colorBgContainer: '#FFFFFF',
      activeBorderColor: '#76B900',
      hoverBorderColor: '#D1D1D6',
    },
    Select: {
      colorBgContainer: '#FFFFFF',
      optionSelectedBg: 'rgba(118, 185, 0, 0.08)',
    },
    Tag: {
      borderRadiusSM: 999,
    },
    Descriptions: {
      colorSplit: '#E5E5EA',
      titleColor: '#6E6E73',
      contentColor: '#1D1D1F',
    },
    Timeline: {
      dotBorderWidth: 2,
      tailColor: '#E5E5EA',
    },
    Breadcrumb: {
      separatorColor: '#AEAEB2',
      linkColor: '#6E6E73',
      linkHoverColor: '#1D1D1F',
      lastItemColor: '#1D1D1F',
    },
    Statistic: {
      titleFontSize: 12,
      contentFontSize: 28,
    },
    Progress: {
      remainingColor: '#E5E5EA',
    },
    Tabs: {
      inkBarColor: '#76B900',
      itemSelectedColor: '#76B900',
      itemColor: '#6E6E73',
      itemHoverColor: '#1D1D1F',
    },
    Collapse: {
      headerBg: '#F5F5F7',
      contentBg: '#FFFFFF',
    },
    Modal: {
      contentBg: '#FFFFFF',
      headerBg: '#FFFFFF',
    },
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={nvidopiaTheme}>
          <AntdApp>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </AntdApp>
        </ConfigProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
