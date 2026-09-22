package net.czedik.hermann.tdt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import com.fasterxml.jackson.databind.JsonNode;

import net.czedik.hermann.tdt.actions.AccessAction;
import net.czedik.hermann.tdt.actions.JoinAction;
import net.czedik.hermann.tdt.actions.SettingsAction;
import net.czedik.hermann.tdt.actions.StartAction;
import net.czedik.hermann.tdt.actions.TeamReadyAction;
import net.czedik.hermann.tdt.actions.TypeAction;

/**
 * Drives a TEAM mode game to its draw rounds through the public API of {@link Game} and checks that a drawing is
 * only submitted once every connected member of a team has approved it.
 */
class TeamApprovalGameTests {

    private static final String GAME_ID = "abcde";

    private static final byte[] PNG_BYTES = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R'};

    private static final List<String> NAMES = List.of("Alice", "Bob", "Carol", "Dave", "Erin", "Frank", "Grace", "Heidi");

    @TempDir
    Path gameDir;

    private Game game;
    private final List<TestClient> players = new ArrayList<>();

    /** 1-based number of the draw round the game is currently in (teams have one round per team). */
    private int drawRound;

    /** A client over a mocked websocket session that records every state JSON it was sent. */
    private static class TestClient {
        final String playerId;
        final Client client;
        final List<JsonNode> messages = new ArrayList<>();

        /** Number of messages that were already there when the test last called {@link #mark()}. */
        private int mark;

        TestClient(String playerId) throws IOException {
            this.playerId = playerId;
            WebSocketSession session = mock(WebSocketSession.class);
            when(session.getId()).thenReturn("session-" + playerId);
            doAnswer(invocation -> {
                TextMessage message = invocation.getArgument(0);
                messages.add(JSONHelper.stringToJsonNode(message.getPayload()));
                return null;
            }).when(session).sendMessage(any(TextMessage.class));
            this.client = new Client(session);
        }

        /** The state name of the last message received. */
        String state() {
            return messages.get(messages.size() - 1).get("state").asText();
        }

        /** The last message with the given state, so a relayed event does not hide the player state (or vice versa). */
        JsonNode lastMessage(String state) {
            for (int i = messages.size() - 1; i >= 0; i--) {
                if (messages.get(i).get("state").asText().equals(state)) return messages.get(i);
            }
            return null;
        }

        /** Whether a message with that state arrived since the last {@link #mark()}. */
        boolean received(String state) {
            return messages.subList(mark, messages.size()).stream()
                    .anyMatch(m -> m.get("state").asText().equals(state));
        }

        /** Starts a fresh observation window: only messages sent from now on count as received. */
        void mark() {
            mark = messages.size();
        }

        int newMessageCount() {
            return messages.size() - mark;
        }
    }

    /** Creates a TEAM mode game with the given number of players and plays it up to its first draw round. */
    private void startGameAndReachDrawRound(int numPlayers) throws IOException {
        TestClient creator = new TestClient(NAMES.get(0).toLowerCase());
        game = new Game(GAME_ID, gameDir, new Player(creator.playerId, NAMES.get(0), "A", true, null),
                new TdtProperties.Limits(), true);
        game.access(creator.client, new AccessAction(GAME_ID, creator.playerId));
        players.add(creator);

        for (String name : NAMES.subList(1, numPlayers)) {
            TestClient player = new TestClient(name.toLowerCase());
            game.join(player.client, new JoinAction(GAME_ID, player.playerId, name, "B", null));
            players.add(player);
        }

        SettingsAction settings = new SettingsAction();
        settings.setGameMode(GameMode.TEAM);
        game.settings(creator.client, settings);

        game.start(creator.client, new StartAction(0, 0));

        finishTypeRound();
        drawRound = 2;
        assertDrawRound();
        players.forEach(TestClient::mark);
    }

    /** Types for everybody who has to: in TEAM mode only the first member of each team picks the topic. */
    private void finishTypeRound() {
        for (TestClient player : players) {
            if ("type".equals(player.state())) {
                game.type(player.client, new TypeAction("A sentence by " + player.playerId));
            }
        }
    }

    private void assertDrawRound() {
        for (TestClient player : players) {
            assertEquals("draw", player.state(), player.playerId + " should be drawing");
            assertEquals(drawRound, player.lastMessage("draw").get("round").asInt());
        }
    }

    /** Approves (or withdraws the approval of) the team drawing of the current draw round. */
    private void approve(TestClient player, boolean ready) {
        TeamReadyAction action = new TeamReadyAction();
        action.setRound(drawRound);
        action.setReady(ready);
        game.teamReady(player.client, action);
    }

    /** Lets every team approve its drawing and has the asked-for member upload it. */
    private void submitAllDrawings() throws IOException {
        for (int i = 0; i < players.size(); i += 2) {
            TestClient last = players.get(Math.min(i + 1, players.size() - 1));
            approve(players.get(i), true);
            if (last != players.get(i)) approve(last, true);
            assertTrue(last.received("teamSubmit"), last.playerId + " should have been asked to submit");
            game.draw(last.client, ByteBuffer.wrap(PNG_BYTES));
        }
    }

    @Test
    void oneApprovalOnlyTellsThePartnerAboutIt() throws IOException {
        startGameAndReachDrawRound(4);

        approve(players.get(0), true);

        assertFalse(players.get(0).received("teamSubmit"), "nobody should be asked to submit yet");
        assertFalse(players.get(1).received("teamSubmit"), "nobody should be asked to submit yet");

        assertEquals("draw", players.get(0).state());
        assertTrue(players.get(0).lastMessage("draw").get("teamSelfReady").asBoolean());
        assertFalse(players.get(0).lastMessage("draw").get("teamPartnerReady").asBoolean());

        assertEquals("draw", players.get(1).state());
        assertFalse(players.get(1).lastMessage("draw").get("teamSelfReady").asBoolean());
        assertTrue(players.get(1).lastMessage("draw").get("teamPartnerReady").asBoolean());

        // the other team is not affected by it
        assertEquals(0, players.get(2).newMessageCount());
        assertEquals(0, players.get(3).newMessageCount());
    }

    @Test
    void approvalOfBothMembersAsksTheSecondApproverToSubmit() throws IOException {
        startGameAndReachDrawRound(4);

        approve(players.get(0), true);
        approve(players.get(1), true);

        assertFalse(players.get(0).received("teamSubmit"));
        assertTrue(players.get(1).received("teamSubmit"), "the completing approver uploads the shared canvas");
        assertEquals(drawRound, players.get(1).lastMessage("teamSubmit").get("round").asInt());

        // only that upload finishes the round for the team
        assertEquals("draw", players.get(0).state());
        game.draw(players.get(1).client, ByteBuffer.wrap(PNG_BYTES));

        assertEquals("waitForRoundFinish", players.get(0).state());
        assertEquals("waitForRoundFinish", players.get(1).state());
        assertEquals("draw", players.get(2).state());
        assertEquals("draw", players.get(3).state());
    }

    @Test
    void withdrawnApprovalKeepsTheTeamDrawing() throws IOException {
        startGameAndReachDrawRound(4);

        approve(players.get(0), true);
        approve(players.get(0), false);
        approve(players.get(1), true);

        assertFalse(players.get(0).received("teamSubmit"));
        assertFalse(players.get(1).received("teamSubmit"));

        assertFalse(players.get(0).lastMessage("draw").get("teamSelfReady").asBoolean());
        assertTrue(players.get(0).lastMessage("draw").get("teamPartnerReady").asBoolean());
    }

    @Test
    void approvalForAnotherRoundIsIgnored() throws IOException {
        startGameAndReachDrawRound(4);

        TeamReadyAction staleAction = new TeamReadyAction();
        staleAction.setRound(drawRound - 1);
        staleAction.setReady(true);
        game.teamReady(players.get(0).client, staleAction);

        approve(players.get(1), true);

        assertFalse(players.get(0).received("teamSubmit"));
        assertFalse(players.get(1).received("teamSubmit"));
    }

    @Test
    void teamIsNotBlockedByAMemberThatLeft() throws IOException {
        startGameAndReachDrawRound(4);

        approve(players.get(0), true);
        assertFalse(players.get(0).received("teamSubmit"));

        game.clientDisconnected(players.get(1).client);

        assertTrue(players.get(0).received("teamSubmit"), "the remaining member must be able to finish the round");
    }

    @Test
    void aPlayerWithoutAPartnerSubmitsAlone() throws IOException {
        startGameAndReachDrawRound(5); // two teams of two plus a solo player

        TestClient solo = players.get(4);
        assertFalse(solo.lastMessage("draw").has("teamPartner"), "the solo player has no partner");

        approve(solo, true);

        assertTrue(solo.received("teamSubmit"));
    }

    @Test
    void approvalsDoNotCarryOverToTheNextDrawRound() throws IOException {
        startGameAndReachDrawRound(8); // four teams, so the rounds are: type, draw, type, draw

        submitAllDrawings();
        finishTypeRound();

        drawRound = 4;
        assertDrawRound();
        for (TestClient player : players) {
            assertFalse(player.lastMessage("draw").get("teamSelfReady").asBoolean(),
                    player.playerId + " should start the round without an approval");
            assertFalse(player.lastMessage("draw").get("teamPartnerReady").asBoolean(),
                    player.playerId + " should start the round without their partner's approval");
        }

        players.forEach(TestClient::mark);
        approve(players.get(0), true);

        assertFalse(players.get(0).received("teamSubmit"));
        assertTrue(players.get(1).lastMessage("draw").get("teamPartnerReady").asBoolean());
    }
}
