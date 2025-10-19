import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ConfigProvider } from 'antd';
import theme from '@/config/themeConfig';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ConfigProvider theme={theme}>
      <Component {...pageProps} />
    </ConfigProvider>
);
}
