import React from 'react';
import {Route, Routes} from 'react-router-dom';
import Container from './components/Contianer';

const App: React.FC = () => {
    return (
        <Routes>
            <Route path='/' element={<Container><p>React SRR Vite server. (Typescript)</p></Container>}/>
            <Route path='*' element={<Container><p>404</p></Container>}/>
        </Routes>
    );
}

export default App;