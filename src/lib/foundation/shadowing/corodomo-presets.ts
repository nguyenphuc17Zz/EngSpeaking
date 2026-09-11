import type { WordIpaToken } from "./ipa-dictionary";
import { BBC_OFFICE_ENGLISH_LESSON } from "./bbc-office-english";

export interface CorodomoSegment {
  segment_id: string;
  text: string;
  start_time: number;
  end_time: number;
  translationVi?: string;
  thoughtGroups?: string;
  ipa?: string;
  wordsWithIpa?: WordIpaToken[];
}

export interface CorodomoVideoLesson {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | string;
  playlistName: string;
  playlistId: string;
  thumbnail: string;
  duration: string;
  segments: CorodomoSegment[];
}

export const CORODOMO_VIDEO_PRESETS: CorodomoVideoLesson[] = [
  BBC_OFFICE_ENGLISH_LESSON,
  {
    id: "coro_travel_a1",
    youtubeId: "gFkNhGDd8Ws",
    title: "English shadowing | Travel and Holidays | Level A1 | How to improve English",
    channel: "English Shadowing Channel",
    cefrLevel: "A1",
    playlistName: "Travel and Holidays",
    playlistId: "cmttgm2lz3wglugcqc0g6yzji",
    thumbnail: "https://i.ytimg.com/vi/gFkNhGDd8Ws/hqdefault.jpg",
    duration: "04:30",
    segments: [
      {
        segment_id: "seg_001",
        text: "Do you like traveling?",
        start_time: 2.0,
        end_time: 4.5,
        translationVi: "Bạn có thích đi du lịch không?",
        thoughtGroups: "Do you like / traveling?",
        ipa: "duː juː laɪk ˈtrævəlɪŋ",
      },
      {
        segment_id: "seg_002",
        text: "Yes, I really enjoy visiting new places.",
        start_time: 5.0,
        end_time: 9.0,
        translationVi: "Có, tôi thực sự thích ghé thăm những địa điểm mới.",
        thoughtGroups: "Yes, / I really enjoy / visiting new places.",
        ipa: "jɛs, aɪ ˈrɪəli ɪnˈʤɔɪ ˈvɪzɪtɪŋ njuː ˈpleɪsɪz",
      },
      {
        segment_id: "seg_003",
        text: "Where did you go on your last holiday?",
        start_time: 9.5,
        end_time: 13.0,
        translationVi: "Bạn đã đi đâu trong kỳ nghỉ gần đây nhất?",
        thoughtGroups: "Where did you go / on your last holiday?",
        ipa: "weə dɪd juː gəʊ ɒn jɔː lɑːst ˈhɒlədeɪ",
      },
      {
        segment_id: "seg_004",
        text: "I went to the beach with my family.",
        start_time: 13.5,
        end_time: 17.0,
        translationVi: "Tôi đã đi biển cùng với gia đình.",
        thoughtGroups: "I went to the beach / with my family.",
        ipa: "aɪ wɛnt tuː ðə biːʧ wɪð maɪ ˈfæmɪli",
      },
      {
        segment_id: "seg_005",
        text: "The weather was sunny and warm every day.",
        start_time: 17.5,
        end_time: 21.5,
        translationVi: "Thời tiết thì nắng và ấm áp mỗi ngày.",
        thoughtGroups: "The weather was sunny / and warm every day.",
        ipa: "ðə ˈwɛðə wɒz ˈsʌni ænd wɔːm ˈɛvri deɪ",
      },
      {
        segment_id: "seg_006",
        text: "What activities did you do there?",
        start_time: 22.0,
        end_time: 25.5,
        translationVi: "Bạn đã tham gia những hoạt động gì ở đó?",
        thoughtGroups: "What activities / did you do there?",
        ipa: "wɒt ækˈtɪvɪtiz dɪd juː duː ðeə",
      },
      {
        segment_id: "seg_007",
        text: "We went swimming and ate delicious seafood.",
        start_time: 26.0,
        end_time: 30.0,
        translationVi: "Chúng tôi đã đi bơi và thưởng thức hải sản rất ngon.",
        thoughtGroups: "We went swimming / and ate delicious seafood.",
        ipa: "wiː wɛnt ˈswɪmɪŋ ænd ɛt dɪˈlɪʃəs ˈsiːfuːd",
      },
      {
        segment_id: "seg_008",
        text: "Do you prefer traveling by plane or by train?",
        start_time: 30.5,
        end_time: 34.5,
        translationVi: "Bạn thích đi du lịch bằng máy bay hay tàu hỏa hơn?",
        thoughtGroups: "Do you prefer traveling / by plane / or by train?",
        ipa: "duː juː priˈfɜː ˈtrævlɪŋ baɪ pleɪn ɔː baɪ treɪn",
      },
      {
        segment_id: "seg_009",
        text: "I prefer taking the train because it is more relaxing.",
        start_time: 35.0,
        end_time: 40.0,
        translationVi: "Tôi thích đi tàu hơn vì cảm giác thư thái hơn.",
        thoughtGroups: "I prefer taking the train / because it is more relaxing.",
        ipa: "aɪ priˈfɜː ˈteɪkɪŋ ðə treɪn bɪˈkɒz ɪt ɪz mɔː rɪˈlæksɪŋ",
      },
      {
        segment_id: "seg_010",
        text: "Traveling helps me learn about different cultures.",
        start_time: 40.5,
        end_time: 45.0,
        translationVi: "Đi du lịch giúp tôi khám phá nhiều nền văn hóa khác nhau.",
        thoughtGroups: "Traveling helps me / learn about different cultures.",
        ipa: "ˈtrævlɪŋ hɛlps miː lɜːn əˈbaʊt ˈdɪfrənt ˈkʌlʧəz",
      },
      {
        segment_id: "seg_011",
        text: "I hope to visit Japan for my next trip.",
        start_time: 45.5,
        end_time: 49.5,
        translationVi: "Tôi hy vọng sẽ được ghé thăm Nhật Bản trong chuyến đi tới.",
        thoughtGroups: "I hope to visit Japan / for my next trip.",
        ipa: "aɪ həʊp tuː ˈvɪzɪt ʤəˈpæn fɔː maɪ nɛkst trɪp",
      },
      {
        segment_id: "seg_012",
        text: "It is always great to pack light and travel freely.",
        start_time: 50.0,
        end_time: 54.5,
        translationVi: "Hành lý gọn nhẹ để đi lại tự do luôn là điều tuyệt vời.",
        thoughtGroups: "It is always great / to pack light / and travel freely.",
        ipa: "ɪt ɪz ˈɔːlweɪz greɪt tuː pæk laɪt ænd ˈtrævl ˈfriːli",
      },
    ],
  },
  {
    id: "coro_daily_a2",
    youtubeId: "Wv0c5BwU2o4",
    title: "Daily English Conversation Practice | Easy Morning Routines | Level A2",
    channel: "Daily Fluent English",
    cefrLevel: "A2",
    playlistName: "Daily Life English",
    playlistId: "cmtt_daily_routines_a2",
    thumbnail: "https://i.ytimg.com/vi/Wv0c5BwU2o4/hqdefault.jpg",
    duration: "03:45",
    segments: [
      {
        segment_id: "seg_101",
        text: "What time do you usually wake up on weekdays?",
        start_time: 2.0,
        end_time: 5.5,
        translationVi: "Bạn thường thức dậy lúc mấy giờ vào các ngày trong tuần?",
        thoughtGroups: "What time do you usually wake up / on weekdays?",
        ipa: "wɒt taɪm duː juː ˈjuːʒʊəli weɪk ʌp ɒn ˈwiːkdeɪz",
      },
      {
        segment_id: "seg_102",
        text: "I usually set my alarm for seven o'clock.",
        start_time: 6.0,
        end_time: 9.5,
        translationVi: "Tôi thường đặt báo thức lúc 7 giờ sáng.",
        thoughtGroups: "I usually set my alarm / for seven o'clock.",
        ipa: "aɪ ˈjuːʒʊəli sɛt maɪ əˈlɑːm fɔː ˈsɛvn əˈklɒk",
      },
      {
        segment_id: "seg_103",
        text: "I always start my morning with a hot cup of black coffee.",
        start_time: 10.0,
        end_time: 14.5,
        translationVi: "Tôi luôn bắt đầu buổi sáng bằng một tách cà phê đen nóng.",
        thoughtGroups: "I always start my morning / with a hot cup / of black coffee.",
        ipa: "aɪ ˈɔːlweɪz stɑːt maɪ ˈmɔːnɪŋ wɪð ə hɒt kʌp ɒv blæk ˈkɒfi",
      },
      {
        segment_id: "seg_104",
        text: "Then I spend fifteen minutes doing light stretching.",
        start_time: 15.0,
        end_time: 19.0,
        translationVi: "Sau đó tôi dành 15 phút để giãn cơ nhẹ nhàng.",
        thoughtGroups: "Then I spend fifteen minutes / doing light stretching.",
        ipa: "ðɛn aɪ spɛnd ˈfɪfˈtiːn ˈmɪnɪts ˈduːɪŋ laɪt ˈstrɛʧɪŋ",
      },
      {
        segment_id: "seg_105",
        text: "Having a consistent routine keeps me energized all day.",
        start_time: 19.5,
        end_time: 24.5,
        translationVi: "Duy trì thói quen đều đặn giúp tôi tràn đầy năng lượng cả ngày.",
        thoughtGroups: "Having a consistent routine / keeps me energized / all day.",
        ipa: "ˈhævɪŋ ə kənˈsɪstənt ruːˈtiːn kiːps miː ˈɛnəʤaɪzd ɔːl deɪ",
      },
    ],
  },
  {
    id: "coro_interview_b2",
    youtubeId: "1mHjMNZZvFo",
    title: "Job Interview Communication Skills & Confidence | Level B2",
    channel: "Career English Academy",
    cefrLevel: "B2",
    playlistName: "Workplace & Career",
    playlistId: "cmtt_career_b2",
    thumbnail: "https://i.ytimg.com/vi/1mHjMNZZvFo/hqdefault.jpg",
    duration: "05:15",
    segments: [
      {
        segment_id: "seg_201",
        text: "Could you walk me through your background and core strengths?",
        start_time: 2.0,
        end_time: 6.5,
        translationVi: "Bạn có thể giới thiệu sơ lược về kinh nghiệm và điểm mạnh cốt lõi của mình?",
        thoughtGroups: "Could you walk me through / your background / and core strengths?",
        ipa: "kʊd juː wɔːk miː θruː jɔː ˈbækgraʊnd ænd kɔː strɛŋθs",
      },
      {
        segment_id: "seg_202",
        text: "Over the past five years, I have specialized in leading cross-functional teams.",
        start_time: 7.0,
        end_time: 12.0,
        translationVi: "Trong 5 năm qua, tôi chuyên dẫn dắt các đội ngũ liên chức năng.",
        thoughtGroups: "Over the past five years, / I have specialized in / leading cross-functional teams.",
        ipa: "ˈəʊvə ðə pɑːst faɪv jɪəz, aɪ hæv ˈspɛʃəlaɪzd ɪn ˈliːdɪŋ krɒs-ˈfʌŋkʃənl tiːmz",
      },
      {
        segment_id: "seg_203",
        text: "My primary strength is breaking down complex problems into clear, actionable steps.",
        start_time: 12.5,
        end_time: 18.0,
        translationVi: "Điểm mạnh lớn nhất của tôi là đơn giản hóa các bài toán phức tạp thành các bước hành động rõ ràng.",
        thoughtGroups: "My primary strength is / breaking down complex problems / into clear, actionable steps.",
        ipa: "maɪ ˈpraɪməri strɛŋθ ɪz ˈbreɪkɪŋ daʊn ˈkɒmplɛks ˈprɒbləmz ˈɪntuː klɪə, ˈækʃnəbl stɛps",
      },
      {
        segment_id: "seg_204",
        text: "I thrive in fast-paced environments where collaboration is key.",
        start_time: 18.5,
        end_time: 23.0,
        translationVi: "Tôi phát huy tốt nhất trong môi trường tốc độ cao, nơi sự cộng tác đóng vai trò quyết định.",
        thoughtGroups: "I thrive in fast-paced environments / where collaboration is key.",
        ipa: "aɪ θraɪv ɪn fɑːst-peɪst ɪnˈvaɪərənmənts weə kəˌlæbəˈreɪʃən ɪz kiː",
      },
    ],
  },
  {
    id: "coro_ted_c1",
    youtubeId: "iCvmsMzlF7o",
    title: "The Power of Vulnerability & Genuine Connection | Level C1",
    channel: "TED Masterclass",
    cefrLevel: "C1",
    playlistName: "TED & Advanced Ideas",
    playlistId: "cmtt_ted_c1",
    thumbnail: "https://i.ytimg.com/vi/iCvmsMzlF7o/hqdefault.jpg",
    duration: "06:10",
    segments: [
      {
        segment_id: "seg_301",
        text: "Connection is why we are here; it is what gives purpose and meaning to our lives.",
        start_time: 2.5,
        end_time: 8.0,
        translationVi: "Sự kết nối là lý do chúng ta có mặt ở đây; nó mang lại mục đích và ý nghĩa cho cuộc sống.",
        thoughtGroups: "Connection is why we are here; // it is what gives purpose / and meaning to our lives.",
        ipa: "kəˈnɛkʃən ɪz waɪ wiː ɑː hɪə; ɪt ɪz wɒt gɪvz ˈpɜːpəs ænd ˈmiːnɪŋ tuː ˈaʊə lɪvz",
      },
      {
        segment_id: "seg_302",
        text: "In order for genuine connection to happen, we must allow ourselves to be truly seen.",
        start_time: 8.5,
        end_time: 14.5,
        translationVi: "Để sự kết nối chân thực xảy ra, chúng ta phải can đảm mở lòng để người khác thực sự nhìn thấy mình.",
        thoughtGroups: "In order for genuine connection to happen, / we must allow ourselves / to be truly seen.",
        ipa: "ɪn ˈɔːdə fɔː ˈʤɛnjʊɪn kəˈnɛkʃən tuː ˈhæpən, wiː mʌst əˈlaʊ ˌaʊəˈsɛlvz tuː biː ˈtruːli siːn",
      },
      {
        segment_id: "seg_303",
        text: "Vulnerability is not weakness; it is the birthplace of innovation, creativity, and empathy.",
        start_time: 15.0,
        end_time: 21.5,
        translationVi: "Sự tổn thương không phải là yếu đuối; đó là cái nôi của sự đổi mới, sáng tạo và thấu cảm.",
        thoughtGroups: "Vulnerability is not weakness; // it is the birthplace of innovation, / creativity, and empathy.",
        ipa: "ˌvʌlnərəˈbɪlɪti ɪz nɒt ˈwiːknɪs; ɪt ɪz ðə ˈbɜːθpleɪs ɒv ˌɪnəʊˈveɪʃən, ˌkriːeɪˈtɪvɪti, ænd ˈɛmpəθi",
      },
    ],
  },
];

/**
 * Extracts clean 11-char YouTube ID from URL or bare string
 */
export function extractYouTubeVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle various URL formats
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (v && v.length === 11) return v;
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "v"].includes(parts[0]) && parts[1]) {
        return parts[1].slice(0, 11);
      }
    }
    if (parsed.hostname.includes("youtu.be")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0]) return parts[0].slice(0, 11);
    }
  } catch {}

  // Regex fallback
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}
