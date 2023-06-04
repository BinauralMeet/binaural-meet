import React from 'react';
import './spinerStyle.css';

interface SpinnerProps {
  isVisible: boolean;
}

const Spinner: React.FC<SpinnerProps> = ({ isVisible }) => (
  isVisible ? <div className="loader pos-center"></div> : null
);

export default Spinner;
