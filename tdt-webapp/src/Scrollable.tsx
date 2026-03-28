import styled from "styled-components";

const Scrollable = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: #080818;

  /* Cyberpunk scrollbar */
  scrollbar-width: thin;
  scrollbar-color: #00f5ff #0c0c20;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: #0c0c20;
  }
  &::-webkit-scrollbar-thumb {
    background: #00f5ff;
    border-radius: 3px;
    box-shadow: 0 0 6px #00f5ff;
  }
`;

export default Scrollable;
