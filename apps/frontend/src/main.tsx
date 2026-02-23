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
    colorPrimary: '#00f0ff',
    colorInfo: '#00f0ff',
    colorSuccess: '#00ff88',
    colorWarning: '#f0ff00',
    colorError: '#ff0044',
    colorBgContainer: 'rgba(0, 240, 255, 0.03)',
    colorBgElevated: 'rgba(0, 240, 255, 0.06)',
    colorBgLayout: 'transparent',
    colorBorder: 'rgba(0, 240, 255, 0.1)',
    colorBorderSecondary: 'rgba(0, 240, 255, 0.06)',
    colorText: '#e2e8f0',
    colorTextSecondary: '#94a3b8',
    colorTextTertiary: '#64748b',
    colorTextQuaternary: '#475569',
    borderRadius: 4,
    borderRadiusLG: 4,
    borderRadiusSM: 2,
    fontFamily: "'Share Tech Mono', 'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 13,
    controlHeight: 36,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: 'transparent',
      siderBg: 'transparent',
      bodyBg: 'transparent',
      triggerBg: 'rgba(0, 240, 255, 0.06)',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(0, 240, 255, 0.1)',
      darkItemHoverBg: 'rgba(0, 240, 255, 0.05)',
      darkItemColor: '#94a3b8',
      darkItemSelectedColor: '#00f0ff',
      itemBorderRadius: 4,
      itemMarginInline: 8,
      iconSize: 16,
    },
    Table: {
      headerBg: 'rgba(0, 240, 255, 0.02)',
      headerColor: '#00f0ff',
      rowHoverBg: 'rgba(0, 240, 255, 0.04)',
      borderColor: 'rgba(0, 240, 255, 0.06)',
      cellPaddingBlock: 12,
      cellPaddingInline: 14,
    },
    Card: {
      colorBgContainer: 'rgba(0, 240, 255, 0.03)',
      colorBorderSecondary: 'rgba(0, 240, 255, 0.1)',
    },
    Button: {
      primaryShadow: '0 0 12px rgba(0, 240, 255, 0.4)',
      defaultBg: 'rgba(0, 240, 255, 0.04)',
      defaultBorderColor: 'rgba(0, 240, 255, 0.15)',
      borderRadius: 4,
      borderRadiusLG: 4,
    },
    Input: {
      colorBgContainer: 'rgba(0, 240, 255, 0.03)',
      activeBorderColor: '#00f0ff',
      hoverBorderColor: 'rgba(0, 240, 255, 0.4)',
    },
    Select: {
      colorBgContainer: 'rgba(0, 240, 255, 0.03)',
      optionSelectedBg: 'rgba(0, 240, 255, 0.1)',
    },
    Tag: {
      borderRadiusSM: 2,
    },
    Descriptions: {
      colorSplit: 'rgba(0, 240, 255, 0.06)',
      titleColor: '#00f0ff',
      contentColor: '#94a3b8',
    },
    Timeline: {
      dotBorderWidth: 2,
      tailColor: 'rgba(0, 240, 255, 0.12)',
    },
    Breadcrumb: {
      separatorColor: '#475569',
      linkColor: '#94a3b8',
      linkHoverColor: '#00f0ff',
      lastItemColor: '#e2e8f0',
    },
    Statistic: {
      titleFontSize: 11,
      contentFontSize: 28,
    },
    Progress: {
      remainingColor: 'rgba(0, 240, 255, 0.06)',
    },
    Tabs: {
      inkBarColor: '#00f0ff',
      itemSelectedColor: '#00f0ff',
      itemColor: '#94a3b8',
      itemHoverColor: '#00f0ff',
    },
    Collapse: {
      headerBg: 'rgba(0, 240, 255, 0.02)',
      contentBg: 'transparent',
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
