package com.app.backendjava.features.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TopQuizDto {
    private int id;
    private String title;
    private String authorUsername;
    private int attemptCount;
    private int commentCount;
    private int questionCount;
}