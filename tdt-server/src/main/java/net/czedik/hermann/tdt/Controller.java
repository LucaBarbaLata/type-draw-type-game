package net.czedik.hermann.tdt;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api")
public class Controller {
    private static final Logger log = LoggerFactory.getLogger(Controller.class);

    private final GameManager gameManager;

    public Controller(GameManager gameManager) {
        this.gameManager = gameManager;
    }

    @PostMapping(path = "/create",
        consumes = { MediaType.APPLICATION_JSON_VALUE },
        produces = { MediaType.APPLICATION_JSON_VALUE })
    public CreateGameResponse createGame(@Valid @RequestBody CreateGameRequest createGameRequest) throws IOException {
        log.info("Create game: {}", createGameRequest);
        String gameId = gameManager.newGame(createGameRequest);
        CreateGameResponse response = new CreateGameResponse(gameId);
        log.info("Created game: {}", response);
        return response;
    }

    @GetMapping(path = "/games", produces = MediaType.APPLICATION_JSON_VALUE)
    public List<PublicGameInfo> getPublicGames() {
        return gameManager.getPublicGames();
    }

    @GetMapping(path = "/image/{gameId:\\w+}/{imageId:[\\w\\-]+}.png")
    public void getImage(HttpServletResponse response, @PathVariable String gameId, @PathVariable String imageId)
            throws IOException {
        response.setContentType(MediaType.IMAGE_PNG_VALUE);
        Path imagePath = gameManager.getGameDir(gameId).resolve(imageId + ".png");
        try (InputStream in = Files.newInputStream(imagePath)) {
            StreamUtils.copy(in, response.getOutputStream());
        }
    }

    @GetMapping(path = "/replay/{gameId:\\w+}/{replayId:[\\w\\-]+}")
    public void getReplay(HttpServletResponse response, @PathVariable String gameId, @PathVariable String replayId)
            throws IOException {
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Path replayPath = gameManager.getGameDir(gameId).resolve(replayId + ".replay.json");
        try (InputStream in = Files.newInputStream(replayPath)) {
            StreamUtils.copy(in, response.getOutputStream());
        }
    }
}
