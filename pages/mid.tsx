// pages/mid.js
import React, { useState, useEffect } from 'react';
import {App} from './App';
import { i18nInit } from '../src/models/locales';
import { resolveAtEnd } from '../src/models/utils';
import errorInfo from '../src/stores/ErrorInfo';
import contents from '../src/stores/sharedContents/SharedContents';
import { when } from 'mobx';
import { conference } from '../src/models/conference';
import { participants } from '../src/stores/index';
import {urlParameters} from '../src/models/url';
import '../src/models/audio' // init audio manager (DO NOT delete)
import '../src/stores/index';




export const Mid: React.FC<{}> = () => {


    i18nInit().then(main)
    function main() {
      /*  //  Show last log for beforeunload
        const logStr = localStorage.getItem('log')
        console.log(`logStr: ${logStr}`)  //  */

      const startPromise = resolveAtEnd(onStart)()
      startPromise.then(resolveAtEnd(startConference))
    }

    function onStart() {
      //  console.debug('start')
    }
    let logStr = ''
    function startConference() {
      window.addEventListener('beforeunload', (ev) => {
        logStr = `${logStr}beforeunload called. ${Date()} `
        localStorage.setItem('log', logStr)

        //  prevent leaving from and reloading browser, when the user shares screen(s).
        if (!errorInfo.type &&
          (contents.getLocalRtcContentIds().length || contents.mainScreenOwner === participants.localId)) {
          logStr += 'Ask user. '
          ev.preventDefault()
          ev.stopImmediatePropagation()
          ev.returnValue = ''
          localStorage.setItem('log', logStr)

          return ev.returnValue
        }
        errorInfo.onDestruct()
        logStr += `\nBefore call conference.leave().`
        localStorage.setItem('log', logStr)
        conference.leave()
        logStr += `\nconference.leave() called.`
        localStorage.setItem('log', logStr)
      })

      errorInfo.connectionStart()
      when(() => errorInfo.type === '', () => {
        const room = urlParameters.room || '_'
        conference.enter(room, false)
      })
    }

  //   window.addEventListener('touchmove', (ev) => {
  //     ev.preventDefault();
  // }, { passive: false, capture: false });

  // window.addEventListener('contextmenu', (ev) => {
  //     ev.preventDefault();
  // }, { passive: false, capture: false });


  return <App />;
}


Mid.displayName = 'Mid';
export default Mid;
