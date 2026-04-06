package com.app.backendjava.features.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserStatsDto {
    private long quizCount;
    private long questionCount;
    private long sourceCount;
    private long favoriteCount;
}