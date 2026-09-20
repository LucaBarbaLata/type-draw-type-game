import styled from "styled-components";

const Scrollable = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: var(--cyber-bg);

  /* Cyberpunk scrollbar */
  scrollbar-width: thin;
  scrollbar-color: var(--cyber-cyan) var(--cyber-bg-panel);

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: var(--cyber-bg-panel);
  }
  &::-webkit-scrollbar-thumb {
    background: var(--cyber-cyan);
    border-radius: 3px;
    box-shadow: var(--cyber-glow);
  }
`;

export default Scrollable;
