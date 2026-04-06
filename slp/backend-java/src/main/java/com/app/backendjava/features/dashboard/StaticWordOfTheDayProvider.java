package com.app.backendjava.features.dashboard;

import org.springframework.stereotype.Component;
import java.time.LocalDate;
import java.util.List;

@Component
public class StaticWordOfTheDayProvider implements IWordOfTheDayProvider {
    private static final List<WordOfTheDayDto> WORDS = List.of(
            new WordOfTheDayDto("perspicacious", "adjective", "sắc sảo", "She is a perspicacious student.", "From Latin", "First used 1630s"),
            new WordOfTheDayDto("ephemeral", "adjective", "phù du", "Social media fame is ephemeral.", "Greek", "Mayflies are ephemeroptera")
    );

    @Override
    public WordOfTheDayDto getWordOfTheDay() {
        int dayOfYear = LocalDate.now().getDayOfYear();
        return WORDS.get((dayOfYear - 1) % WORDS.size());
    }
}