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
    colorPrimary: '#6366f1',
    colorInfo: '#6366f1',
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorBgContainer: 'rgba(255,255,255,0.04)',
    colorBgElevated: 'rgba(255,255,255,0.08)',
    colorBgLayout: 'transparent',
    colorBorder: 'rgba(255,255,255,0.08)',
    colorBorderSecondary: 'rgba(255,255,255,0.06)',
    colorText: '#e2e8f0',
    colorTextSecondary: '#94a3b8',
    colorTextTertiary: '#64748b',
    colorTextQuaternary: '#475569',
    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    fontFamily: "'Exo 2', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    controlHeight: 38,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: 'transparent',
      siderBg: 'transparent',
      bodyBg: 'transparent',
      triggerBg: 'rgba(255,255,255,0.06)',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(99,102,241,0.15)',
      darkItemHoverBg: 'rgba(255,255,255,0.06)',
      darkItemColor: '#94a3b8',
      darkItemSelectedColor: '#e2e8f0',
      itemBorderRadius: 8,
      itemMarginInline: 8,
      iconSize: 18,
    },
    Table: {
      headerBg: 'rgba(255,255,255,0.03)',
      headerColor: '#94a3b8',
      rowHoverBg: 'rgba(99,102,241,0.08)',
      borderColor: 'rgba(255,255,255,0.06)',
      cellPaddingBlock: 14,
      cellPaddingInline: 16,
    },
    Card: {
      colorBgContainer: 'rgba(255,255,255,0.04)',
      colorBorderSecondary: 'rgba(255,255,255,0.08)',
    },
    Button: {
      primaryShadow: '0 0 12px rgba(99,102,241,0.4)',
      defaultBg: 'rgba(255,255,255,0.06)',
      defaultBorderColor: 'rgba(255,255,255,0.1)',
    },
    Input: {
      colorBgContainer: 'rgba(255,255,255,0.04)',
      activeBorderColor: '#6366f1',
      hoverBorderColor: 'rgba(99,102,241,0.5)',
    },
    Select: {
      colorBgContainer: 'rgba(255,255,255,0.04)',
      optionSelectedBg: 'rgba(99,102,241,0.15)',
    },
    Tag: {
      borderRadiusSM: 6,
    },
    Descriptions: {
      colorSplit: 'rgba(255,255,255,0.06)',
      titleColor: '#e2e8f0',
      contentColor: '#94a3b8',
    },
    Timeline: {
      dotBorderWidth: 2,
      tailColor: 'rgba(255,255,255,0.08)',
    },
    Breadcrumb: {
      separatorColor: '#475569',
      linkColor: '#94a3b8',
      linkHoverColor: '#6366f1',
      lastItemColor: '#e2e8f0',
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 32,
    },
    Progress: {
      remainingColor: 'rgba(255,255,255,0.08)',
    },
    Tabs: {
      inkBarColor: '#6366f1',
      itemSelectedColor: '#e2e8f0',
      itemColor: '#94a3b8',
      itemHoverColor: '#c7d2fe',
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
