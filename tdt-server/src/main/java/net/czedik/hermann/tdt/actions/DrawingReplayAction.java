package net.czedik.hermann.tdt.actions;

import java.util.List;

public record DrawingReplayAction(int round, List<String> frames) {
}
