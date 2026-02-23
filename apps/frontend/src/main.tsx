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
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#8b929a',
    colorInfo: '#60a5fa',
    colorSuccess: '#34d399',
    colorWarning: '#fbbf24',
    colorError: '#f87171',
    colorBgContainer: 'rgba(255, 255, 255, 0.06)',
    colorBgElevated: 'rgba(255, 255, 255, 0.10)',
    colorBgLayout: 'transparent',
    colorBorder: 'rgba(255, 255, 255, 0.08)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.05)',
    colorText: '#e4e7eb',
    colorTextSecondary: '#8b929a',
    colorTextTertiary: '#505660',
    colorTextQuaternary: '#3a3f47',
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
      headerBg: 'transparent',
      siderBg: 'transparent',
      bodyBg: 'transparent',
      triggerBg: 'rgba(255, 255, 255, 0.06)',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(255, 255, 255, 0.08)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.05)',
      darkItemColor: '#8b929a',
      darkItemSelectedColor: '#e4e7eb',
      itemBorderRadius: 10,
      itemMarginInline: 8,
      iconSize: 16,
    },
    Table: {
      headerBg: 'rgba(255, 255, 255, 0.03)',
      headerColor: '#8b929a',
      rowHoverBg: 'rgba(255, 255, 255, 0.04)',
      borderColor: 'rgba(255, 255, 255, 0.06)',
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
    },
    Card: {
      colorBgContainer: 'rgba(255, 255, 255, 0.06)',
      colorBorderSecondary: 'rgba(255, 255, 255, 0.08)',
    },
    Button: {
      primaryShadow: '0 2px 8px rgba(139, 146, 154, 0.15)',
      defaultBg: 'rgba(255, 255, 255, 0.06)',
      defaultBorderColor: 'rgba(255, 255, 255, 0.10)',
      borderRadius: 12,
      borderRadiusLG: 12,
    },
    Input: {
      colorBgContainer: 'rgba(255, 255, 255, 0.04)',
      activeBorderColor: '#8b929a',
      hoverBorderColor: 'rgba(255, 255, 255, 0.2)',
    },
    Select: {
      colorBgContainer: 'rgba(255, 255, 255, 0.04)',
      optionSelectedBg: 'rgba(255, 255, 255, 0.08)',
    },
    Tag: {
      borderRadiusSM: 8,
    },
    Descriptions: {
      colorSplit: 'rgba(255, 255, 255, 0.06)',
      titleColor: '#8b929a',
      contentColor: '#e4e7eb',
    },
    Timeline: {
      dotBorderWidth: 2,
      tailColor: 'rgba(255, 255, 255, 0.08)',
    },
    Breadcrumb: {
      separatorColor: '#3a3f47',
      linkColor: '#8b929a',
      linkHoverColor: '#e4e7eb',
      lastItemColor: '#e4e7eb',
    },
    Statistic: {
      titleFontSize: 12,
      contentFontSize: 28,
    },
    Progress: {
      remainingColor: 'rgba(255, 255, 255, 0.06)',
    },
    Tabs: {
      inkBarColor: '#e4e7eb',
      itemSelectedColor: '#e4e7eb',
      itemColor: '#8b929a',
      itemHoverColor: '#e4e7eb',
    },
    Collapse: {
      headerBg: 'rgba(255, 255, 255, 0.03)',
      contentBg: 'transparent',
    },
    Modal: {
      contentBg: '#18191e',
      headerBg: 'transparent',
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
