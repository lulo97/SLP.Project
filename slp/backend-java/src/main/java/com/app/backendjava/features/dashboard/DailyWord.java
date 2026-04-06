package com.app.backendjava.features.dashboard;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_word")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyWord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String word = "";

    private String partOfSpeech;
    private String vietnameseTranslation;
    private String example;
    private String origin;
    private String funFact;

    @Column(nullable = false)
    private LocalDateTime targetDate;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}