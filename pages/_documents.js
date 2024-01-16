// pages/_document.js
import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <meta charSet="UTF-8" />
          <meta
            name="viewport"
            content="height=device-height, width=device-width, initial-scale=0.5, minimum-scale=0.5, maximum-scale=0.5, user-scalable=no"
          />
          <title>Binaural Meet</title>
          {/* Import external script */}
          <script src="https://apis.google.com/js/client.js"></script>
          <link rel="icon" href="./favicon.ico" />
          <style>
            {`
              body {
                -webkit-text-size-adjust: 100%;
              }
            `}
          </style>
        </Head>
        <body>
          <h1>Loading Binaural Meet</h1>
          <div id="overlay" style="position: fixed; top: 0px; left: 0px;"></div>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
