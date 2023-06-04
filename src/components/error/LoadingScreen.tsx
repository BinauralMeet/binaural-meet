import React from 'react';
import styled, { keyframes } from 'styled-components';

interface LoadingProps {
    isLoading: boolean;
}

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;

  & img {
    width: 50px;
    height: 50px;
    animation: ${spin} 2s linear infinite;
  }
`;

const Loading: React.FC<LoadingProps> = ({isLoading}) => {
    return (
        isLoading &&
        <Spinner>
            <img src='/loading.png' alt="Loading"/>
        </Spinner>
    );
};

export default Loading;
