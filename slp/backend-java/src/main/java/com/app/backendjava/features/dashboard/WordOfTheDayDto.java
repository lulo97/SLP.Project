package com.app.backendjava.features.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WordOfTheDayDto {
    private String word = "";
    private String partOfSpeech = "";
    private String vietnameseTranslation = "";
    private String example = "";
    private String origin;
    private String funFact;
}