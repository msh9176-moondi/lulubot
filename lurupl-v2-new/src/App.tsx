import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ResultPage } from './pages/ResultPage';
import { AdminPage } from './pages/AdminPage';
import { TestCelebrationPage } from './pages/TestCelebrationPage';
import { StageCelebration } from './components/stages/StageCelebration';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/test-celebration" element={<TestCelebrationPage />} />
      </Routes>
      {/* 전역 축하 애니메이션 */}
      <StageCelebration />
    </BrowserRouter>
  );
}

export default App;
