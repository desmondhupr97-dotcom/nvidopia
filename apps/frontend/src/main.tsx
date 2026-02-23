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
    colorPrimary: '#00FF41',
    colorInfo: '#00FF41',
    colorSuccess: '#00FF41',
    colorWarning: '#FFB000',
    colorError: '#FF0033',
    colorBgContainer: 'rgba(0, 255, 65, 0.02)',
    colorBgElevated: 'rgba(0, 255, 65, 0.04)',
    colorBgLayout: 'transparent',
    colorBorder: 'rgba(0, 255, 65, 0.08)',
    colorBorderSecondary: 'rgba(0, 255, 65, 0.04)',
    colorText: '#b8d4b8',
    colorTextSecondary: '#6b9b6b',
    colorTextTertiary: '#3d6b3d',
    colorTextQuaternary: '#2a4a2a',
    borderRadius: 2,
    borderRadiusLG: 2,
    borderRadiusSM: 1,
    fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
    fontSize: 12,
    controlHeight: 30,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: 'transparent',
      siderBg: 'transparent',
      bodyBg: 'transparent',
      triggerBg: 'rgba(0, 255, 65, 0.04)',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(0, 255, 65, 0.08)',
      darkItemHoverBg: 'rgba(0, 255, 65, 0.04)',
      darkItemColor: '#6b9b6b',
      darkItemSelectedColor: '#00FF41',
      itemBorderRadius: 2,
      itemMarginInline: 6,
      iconSize: 14,
    },
    Table: {
      headerBg: 'rgba(0, 255, 65, 0.02)',
      headerColor: '#00FF41',
      rowHoverBg: 'rgba(0, 255, 65, 0.03)',
      borderColor: 'rgba(0, 255, 65, 0.04)',
      cellPaddingBlock: 8,
      cellPaddingInline: 10,
    },
    Card: {
      colorBgContainer: 'rgba(0, 255, 65, 0.02)',
      colorBorderSecondary: 'rgba(0, 255, 65, 0.08)',
    },
    Button: {
      primaryShadow: '0 0 8px rgba(0, 255, 65, 0.3)',
      defaultBg: 'rgba(0, 255, 65, 0.03)',
      defaultBorderColor: 'rgba(0, 255, 65, 0.12)',
      borderRadius: 2,
      borderRadiusLG: 2,
    },
    Input: {
      colorBgContainer: 'rgba(0, 255, 65, 0.02)',
      activeBorderColor: '#00FF41',
      hoverBorderColor: 'rgba(0, 255, 65, 0.3)',
    },
    Select: {
      colorBgContainer: 'rgba(0, 255, 65, 0.02)',
      optionSelectedBg: 'rgba(0, 255, 65, 0.08)',
    },
    Tag: {
      borderRadiusSM: 1,
    },
    Descriptions: {
      colorSplit: 'rgba(0, 255, 65, 0.04)',
      titleColor: '#00FF41',
      contentColor: '#6b9b6b',
    },
    Timeline: {
      dotBorderWidth: 1,
      tailColor: 'rgba(0, 255, 65, 0.08)',
    },
    Breadcrumb: {
      separatorColor: '#2a4a2a',
      linkColor: '#6b9b6b',
      linkHoverColor: '#00FF41',
      lastItemColor: '#b8d4b8',
    },
    Statistic: {
      titleFontSize: 10,
      contentFontSize: 24,
    },
    Progress: {
      remainingColor: 'rgba(0, 255, 65, 0.04)',
    },
    Tabs: {
      inkBarColor: '#00FF41',
      itemSelectedColor: '#00FF41',
      itemColor: '#6b9b6b',
      itemHoverColor: '#00FF41',
    },
    Collapse: {
      headerBg: 'rgba(0, 255, 65, 0.02)',
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
