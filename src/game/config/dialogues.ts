/**
 * Landmark dialogue data for Bintang Journey.
 *
 * Each entry maps a landmark ID (matching route.ts / assets.ts) to a dialogue
 * bubble shown when the player interacts near that landmark.
 *
 * The goa entry is special: after the player closes the dialogue, the goa ending
 * flow (motor enters goa → fade to black) is triggered by JourneyScene.
 */
export interface LandmarkDialogue {
    /** Landmark ID — must match route.ts segment id or 'goa'. */
    landmarkId: string;
    /** Short label shown at the top of the bubble (e.g. "UPNVJ"). */
    label: string;
    /** The dialogue text body. */
    text: string;
}

export const landmarkDialogues: Record<string, LandmarkDialogue> = {
    'upnvj': {
        landmarkId: 'upnvj',
        label: 'UPNVJ',
        text: 'Tempat berawalnya perjalanan kita, yang mempertemukan dua orang asing hingga menjadi bagian dari cerita yang sama.',
    },
    'ps-gacor': {
        landmarkId: 'ps-gacor',
        label: 'PS GACOR',
        text: 'Tempat sederhana yang menyimpan banyak momen spesial, tempat kita menghabiskan jeda antar kelas sambil bermain Split Fiction dan menciptakan kenangan bersama.',
    },
    'blok-m': {
        landmarkId: 'blok-m',
        label: 'Blok M',
        text: 'Saksi dari masa-masa awal kita saling mengenal, tempat untuk berkumpul dengan PigiPigi, dan foto-foto di photobooth menjadi kenangan yang tak terlupakan.',
    },
    'lenteng': {
        landmarkId: 'lenteng',
        label: 'Lenteng Agung',
        text: 'Stasiun yang berkali-kali menjadi saksi pertemuan dan perpisahan kita, tempat yang selalu mengingatkan bahwa setiap perpisahan adalah awal dari pertemuan berikutnya.',
    },
    'goa': {
        landmarkId: 'goa',
        label: 'Akhir Perjalanan',
        text: 'Happy 6th Monthversary',
    },
};
