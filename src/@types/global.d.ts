declare global{
  interface Window {
    gapiAuthReady: boolean;
    gapiPickerReady: boolean;
    authorizeGdrive: (callback:(result:GoogleApiOAuth2TokenObject)=>void)=>void;
  }
}
export {};