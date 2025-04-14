import RoomSetupPage from "./componts/RoomSetupPage";
import WelcomeScreen from "./componts/WelcomeScreen";
import "./styles/main.scss";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";

function App() {
  return (
    <Router>
      <div className="content-container">
        <Routes>
          <Route
            path="/"
            element={
              <WelcomeScreen />
            }
          />
          <Route path="/setup-room" element={<RoomSetupPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
