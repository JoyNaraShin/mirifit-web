import { Route, Routes } from "react-router";
import { EstimatePage } from "./pages/EstimatePage";
import { GarmentsPage } from "./pages/GarmentsPage";
import { MeasurePage } from "./pages/MeasurePage";
import { ResultPage } from "./pages/ResultPage";
import { StartPage } from "./pages/StartPage";

// 라우트 = 와이어프레임 S1~S5. S6(실측 결과)은 S5와 같은 화면의 데이터 변형.
export function App() {
  return (
    <Routes>
      <Route path="/" element={<StartPage />} />
      <Route path="/estimate" element={<EstimatePage />} />
      <Route path="/measure" element={<MeasurePage />} />
      <Route path="/garments" element={<GarmentsPage />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  );
}
