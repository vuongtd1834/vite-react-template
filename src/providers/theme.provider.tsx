import { ConfigProvider } from 'antd';

import { componentTokens, globalToken } from '@/constants/ant-token';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        cssVar: true,
        token: {
          ...globalToken,
          fontFamily: 'inherit',
        },
        components: {
          ...componentTokens,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
