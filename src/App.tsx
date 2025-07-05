import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FloorLayout from "./components/FloorLayout";
import SectionSeats from "./components/SectionSeats";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FloorLayout />} />
        <Route path="/section/:sectionId" element={<SectionSeats />} />
      </Routes>
    </Router>
  );
};

export default App;
