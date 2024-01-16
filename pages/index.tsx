import React from 'react';
import { useEffect } from 'react';
// import { Mid} from './mid';
import dynamic, {DynamicOptions} from 'next/dynamic'

const Mid = dynamic(import('./mid') as DynamicOptions<{}>, {ssr: false})

export default function Home() {
  console.log('Home')

  return (
    <div>
      <Mid />
    </div>
  );
}