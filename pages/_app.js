// pages/_app.js
// import '../src/models/audio'; // 初始化音频管理器
import { configure } from "mobx";
import Head from 'next/head';
// import '@stores/index'; // 初始化存储

configure({
  enforceActions: "never",
});

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <script dangerouslySetInnerHTML={{ __html: `const d = {};` }} />
        <script src="/config.js" defer></script>
        <script src="https://apis.google.com/js/client.js"></script>
        <link rel="icon" href="./favicon.ico"></link>
        <h1> Loading Binaural Meet </h1>

      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;