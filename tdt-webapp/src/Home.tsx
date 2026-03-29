import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import BigLogoScreen from "./BigLogoScreen";
import HowToButtonAndDialog from "./HowToButtonAndDialog";

const Home = () => {
  const navigate = useNavigate();

  return (
    <BigLogoScreen>
      <Buttons>
        <HowToButtonAndDialog />
        <br />
        <button className="button button-blue" onClick={() => navigate("/server-browser")}>
          Server Browser
        </button>
      </Buttons>
    </BigLogoScreen>
  );
};

export default Home;

const Buttons = styled.div`
  .button {
    margin: 1.5vmin;
  }
`;
