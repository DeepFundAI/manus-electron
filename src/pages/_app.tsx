import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ConfigProvider, App } from 'antd';
import theme from '@/config/themeConfig';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ConfigProvider theme={theme}>
      <App className="h-full">
        <Component {...pageProps} />
      </App>
    </ConfigProvider>
  );
}
