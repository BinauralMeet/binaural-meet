// public/gapi.js
export const developerKey = 'AIzaSyAADCXxUujmh0VqXIzJofwl03MA5O8v8EQ';
export const clientId = "858773398697-vki2lito392c5dlss9s31ap077nn0qbd.apps.googleusercontent.com";
export const appId = "binarual-meet";
export const scope = ['https://www.googleapis.com/auth/drive.file'];

export function loadGoogleDrive() {
  gapi.load('auth', {'callback': ()=>window.gapiAuthReady = true});
  gapi.load('picker', {'callback': ()=> window.gapiPickerReady = true});
}

export function authorizeGdrive(callback) {
  if(gapi){
    gapi.auth.authorize(
    {
      'client_id': clientId,
      'scope': scope,
      'immediate': false
    },
    callback);
  }
}