package com.app.backendjava.features.auth;

import de.mkammerer.argon2.Argon2;
import de.mkammerer.argon2.Argon2Factory;

public class PasswordHasher {
    private static final Argon2 argon2 = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id);

    private static final int ITERATIONS = 4;
    private static final int MEMORY = 65536; // 64 * 1024
    private static final int PARALLELISM = 8;

    public static String hash(String password) {
        return argon2.hash(ITERATIONS, MEMORY, PARALLELISM, password.toCharArray());
    }

    public static boolean verify(String password, String storedHash) {
        return argon2.verify(storedHash, password.toCharArray());
    }
}