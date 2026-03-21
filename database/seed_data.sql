delete from users where id = '1';

INSERT INTO public.users
(id, username, password_hash, email, email_confirmed, "role", status, created_at, updated_at, password_reset_token, password_reset_expiry, email_verification_token, avatar_filename)
VALUES(1, 'admin', 'QJ/Y63lvp9XojMnTHtuMeg==.nfg0oSWRRpU91U9j5s8C5jttA5HjMUUXvAYzAkyn6wk=', 'admin@gmail.com', false, 'admin', 'active', '2026-03-21 10:07:33.595', '2026-03-21 10:07:33.595', NULL, NULL, NULL, NULL);

truncate table daily_word;

INSERT INTO public.daily_word (word, part_of_speech, vietnamese_translation, example, origin, fun_fact, target_date) VALUES
('Serendipity', 'Noun', 'Sự tình cờ may mắn', 'Finding this old photo was a stroke of serendipity.', 'Persian fairy tale "The Three Princes of Serendip"', 'Coined by Horace Walpole in 1754.', CURRENT_DATE - INTERVAL '2 days'),
('Ephemeral', 'Adjective', 'Phù du, chóng tàn', 'The beauty of sunset is ephemeral.', 'Greek "ephemeros" meaning "lasting a day"', 'Mayflies are the most ephemeral insects.', CURRENT_DATE - INTERVAL '1 day'),
('Petrichor', 'Noun', 'Mùi đất sau cơn mưa', 'I love the fresh petrichor after a dry spell.', 'Greek "petra" (stone) + "ichor" (fluid of the gods)', 'The smell comes from plant oils and soil bacteria.', CURRENT_DATE),
('Luminescence', 'Noun', 'Sự phát quang', 'The ocean glowed with bioluminescence.', 'Latin "lumen" (light)', 'Fireflies use luminescence to find mates.', CURRENT_DATE + INTERVAL '1 day'),
('Solitude', 'Noun', 'Sự biệt lập, tĩnh mịch', 'He enjoyed the solitude of the mountains.', 'Latin "solitudo" from "solus" (alone)', 'Solitude is often chosen, while loneliness is forced.', CURRENT_DATE + INTERVAL '2 days'),
('Eloquence', 'Noun', 'Sự hùng biện, tài ăn nói', 'Her eloquence moved the entire audience.', 'Latin "eloqui" (to speak out)', 'Cicero was considered the master of Roman eloquence.', CURRENT_DATE + INTERVAL '3 days'),
('Ineffable', 'Adjective', 'Không thốt nên lời', 'The view from the summit was ineffable.', 'Latin "ineffabilis" (unutterable)', 'Often used for religious or mystical experiences.', CURRENT_DATE + INTERVAL '4 days'),
('Hiraeth', 'Noun', 'Nỗi nhớ quê hương (không thể về)', 'He felt a deep hiraeth for the hills of Wales.', 'Welsh origin', 'It implies a longing for a home that maybe never was.', CURRENT_DATE + INTERVAL '5 days'),
('Mellifluous', 'Adjective', 'Ngọt ngào, dịu dàng (giọng nói)', 'The singer had a mellifluous voice.', 'Latin "mel" (honey) + "fluere" (to flow)', 'Literally means "flowing like honey."', CURRENT_DATE + INTERVAL '6 days'),
('Ethereal', 'Adjective', 'Thanh tao, nhẹ nhàng', 'The mist gave the forest an ethereal look.', 'Greek "aither" (upper air)', 'Originally referred to the highest regions of space.', CURRENT_DATE + INTERVAL '7 days'),
('Sonder', 'Noun', 'Sự nhận thức về cuộc đời người lạ', 'He felt a sense of sonder watching the crowd.', 'Coined by John Koenig', 'Every passerby has a life as complex as your own.', CURRENT_DATE + INTERVAL '8 days'),
('Defenestration', 'Noun', 'Hành động ném ai đó qua cửa sổ', 'The Defenestration of Prague started a war.', 'Latin "de-" (down) + "fenestra" (window)', 'This word was invented for a political act.', CURRENT_DATE + INTERVAL '9 days'),
('Vellichor', 'Noun', 'Nỗi buồn hoài cổ của tiệm sách cũ', 'The vellichor of the shop was intoxicating.', 'Neologism (John Koenig)', 'It captures the "soul" of old books and paper.', CURRENT_DATE + INTERVAL '10 days'),
('Oblivion', 'Noun', 'Sự lãng quên', 'The old empire faded into oblivion.', 'Latin "oblivio"', 'Commonly used in sci-fi to describe the end of time.', CURRENT_DATE + INTERVAL '11 days'),
('Quintessential', 'Adjective', 'Tinh túy, điển hình', 'He is the quintessential English gentleman.', 'Latin "quinta essentia"', 'In alchemy, it was the "fifth element."', CURRENT_DATE + INTERVAL '12 days'),
('Limerence', 'Noun', 'Sự say mê, cuồng si', 'Is it true love, or just limerence?', 'Coined by Dorothy Tennov', 'It describes the "infatuation" stage.', CURRENT_DATE + INTERVAL '13 days'),
('Resilience', 'Noun', 'Sự kiên cường, phục hồi', 'The community showed great resilience.', 'Latin "resilire" (to jump back)', 'In physics, it refers to a material returning to shape.', CURRENT_DATE + INTERVAL '14 days'),
('Wanderlust', 'Noun', 'Nỗi khát khao đi du lịch', 'Her wanderlust took her to every continent.', 'German "wandern" (hike) + "Lust" (desire)', 'Became popular in English in the 19th century.', CURRENT_DATE + INTERVAL '15 days'),
('Aurora', 'Noun', 'Cực quang / Bình minh', 'They traveled north to see the Aurora Borealis.', 'Latin for "dawn"', 'Aurora was the Roman goddess of the sunrise.', CURRENT_DATE + INTERVAL '16 days'),
('Lullaby', 'Noun', 'Bài hát ru', 'The mother sang a soft lullaby.', 'Middle English "lullen" (to lull)', 'The word imitates the "lu-lu" sounds.', CURRENT_DATE + INTERVAL '17 days'),
('Halcyon', 'Adjective', 'Thanh bình, êm đềm', 'They recalled the halcyon days of youth.', 'Greek "alkyon"', 'Refers to a period when the sea stays calm.', CURRENT_DATE + INTERVAL '18 days'),
('Euphoria', 'Noun', 'Trạng thái phởn phơ, hạnh phúc', 'Winning the race induced euphoria.', 'Greek "euphoros"', 'Often used to describe intense joy.', CURRENT_DATE + INTERVAL '19 days'),
('Aquiver', 'Adjective', 'Run rẩy (vì phấn khích)', 'She was aquiver with anticipation.', 'English "a-" + "quiver"', 'A literary way to say someone is trembling.', CURRENT_DATE + INTERVAL '20 days'),
('Bibliosmia', 'Noun', 'Mùi của sách (thường là sách cũ)', 'She inhaled the bibliosmia of the library.', 'Greek "biblio" + "osme"', 'Most people find the smell of old paper comforting.', CURRENT_DATE + INTERVAL '21 days'),
('Chatoyant', 'Adjective', 'Có ánh xà cừ, lấp lánh', 'The cat had chatoyant amber eyes.', 'French "chat" (cat)', 'Refers to light reflection similar to a cat’s eye.', CURRENT_DATE + INTERVAL '22 days'),
('Ebullience', 'Noun', 'Sự sôi nổi, nhiệt huyết', 'His ebullience was contagious.', 'Latin "ebullire" (to bubble up)', 'Imagine a pot of water bubbling over with energy.', CURRENT_DATE + INTERVAL '23 days'),
('Incandescent', 'Adjective', 'Sáng chói, rực rỡ', 'The sky was incandescent with stars.', 'Latin "incandescere"', 'Also used to describe someone full of emotion.', CURRENT_DATE + INTERVAL '24 days'),
('Panacea', 'Noun', 'Thuốc trị bách bệnh', 'Technology is not a panacea for all problems.', 'Greek "pan" (all) + "akos" (cure)', 'Named after the Greek goddess of universal remedy.', CURRENT_DATE + INTERVAL '25 days'),
('Sempiternal', 'Adjective', 'Vĩnh cửu, bất diệt', 'The sempiternal cycle of the seasons.', 'Latin "semper" + "aeternus"', 'Implies "always having been."', CURRENT_DATE + INTERVAL '26 days'),
('Syzygy', 'Noun', 'Sự thẳng hàng của các thiên thể', 'A solar eclipse is a form of syzygy.', 'Greek "syzygos"', 'One of the few English words with three "y"s!', CURRENT_DATE + INTERVAL '27 days');