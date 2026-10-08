import { dropDubbed, type AudioTrack } from '@/shared/captions'
import type { CaptionTrack } from '@/shared/types'

export interface Channel {
  /** YouTube channel ID (starts with `UC`). */
  id: string
  name: string
}

/** Curated YouTube channels per study language. Pick channels with human-made subtitles. */
export const CHANNELS: Record<string, Channel[]> = {
  de: [
    { id: 'UCbxb2fqe9oNgglAoYqsYOtQ', name: 'Easy German' },
    { id: 'UC4zcMHyrT_xyWlgy5WGpFFQ', name: 'BILD' },
    { id: 'UCmN5AEULh0GsQ2mwNlyQG-A', name: 'DER GLÜCKSRITTER' },
    { id: 'UC1lcA9yIr-6brMzptYk_fwA', name: 'Krall & Bubeck' },
    { id: 'UCMIgOXM2JEQ2Pv2d0_PVfcg', name: 'DW Deutsch' },
    { id: 'UC_dZp8bZipnjntBGLVHm6rw', name: 'AfD-Fraktion Bundestag' },
    { id: 'UCSeil5V81-mEGB1-VNR7YEA', name: 'ntv Nachrichten' },
    { id: 'UC5NOEUbkLheQcaaRldYW5GA', name: 'tagesschau' },
    { id: 'UCB37CFICVTUlewYdbMSChIA', name: 'Tichys Einblick' },
    { id: 'UCxU1a-2vec6ljU43I0F2Jwg', name: 'Stuttgarter Zeitung' },
    { id: 'UCZMsvbAhhRblVGXmEXW8TSA', name: 'WELT Nachrichtensender' },
    { id: 'UCBA2L-XIgGYVn_t_8B0VMMg', name: 'Tobias Huch' },
    { id: 'UCyQpfuhftLvrmjxgEzVH78Q', name: 'OE24.TV' },
    { id: 'UCObT1HxDVGDWtvmJxG3E4Cw', name: 'DACH Medien' },
    { id: 'UCcweJsCV2TUP_kzMX25U-oQ', name: 'BR24' },
    { id: 'UCq-b0dwW97YRZWgSCikWQRA', name: 'DIE WELTWOCHE' },
    { id: 'UCqboxXgo9yQ0oVO5anr_jtQ', name: 'Sascha Pallenberg' },
    { id: 'UCFemltyr6criZZsWFHUSHPQ', name: 'Tagesspiegel' },
    { id: 'UCeqKIgPQfNInOswGRWt48kQ', name: 'ZDFheute Nachrichten' },
    { id: 'UCfluzhYpawqHUYNcFdw68Gg', name: 'Carsten Jahn - TEAM HEIMAT' },
    { id: 'UCgAPgHNmQSG_ySHRiOVeF4Q', name: 'FOCUS online' },
    { id: 'UCnk0-FU1ybs9MpWg8g3yqMw', name: 'Politik & Co' },
    { id: 'UC4qhj5cnX0MkbwXQ5vlI1NQ', name: 'Kronen Zeitung' },
    { id: 'UC9kZ6FlOQfusBV8LS2x2fAA', name: 'Militär & Geschichte mit Torsten Heinrich' },
    { id: 'UCMpW4tdyZUid2Ka9_FuDDhQ', name: 'Handelsblatt' },
    { id: 'UCR_iFmLcHBFxc3x3CA71xvw', name: 'Apollo News' },
    { id: 'UCQGqiGhMjc_p4lZEhSTb12g', name: 'NIUS' },
    { id: 'UCPhsnKyNcH3huafz_wNG_5A', name: 'hessenschau' },
    { id: 'UCanbTgWMvESZy3xhXcxjHcg', name: 'WELT Netzreporter' },
    { id: 'UCwyiPnNlT8UABRmGmU0T9jg', name: 'phoenix' },
    { id: 'UCAKB9wGGRccBDrvbbbmgetw', name: 'NDR Info' },
    { id: 'UCy4_zQ59zmS7zO4Dc6vbT_w', name: 'SWR' },
    { id: 'UCRdEdkAlZetdf74bYaBRv3g', name: 'FPÖ TV' },
    { id: 'UCfb7LAYCeJJiT3gyquv7V5Q', name: 'DIE DA OBEN!' },
    { id: 'UCiTKi7Ahf3E2yMGpmIxSvgw', name: 'Deutschland Kurier' },
    { id: 'UCeP-mETJStV6mg34dfUl6rA', name: 'AfD-Fraktion NRW' },
    { id: 'UCsygZtQQSplGF6JA3XWvsdg', name: 'Irgendwas mit ARTE und Kultur' },
    { id: 'UCq2ej2M1Fb62hZxfahZ536A', name: 'ANDI in Deutschland' },
    { id: 'UC6hrzR7smGOGQgOh5q5HZYQ', name: 'HeyWolfi' },
    { id: 'UC_YnP7DDnKzkkVl3BaHiZoQ', name: 'DIE ZEIT' },
    { id: 'UCwRH985XgMYXQ6NxXDo8npw', name: 'Dinge Erklärt – Kurzgesagt' },
    { id: 'UCCEQcvgKK25LmoM3wRX-9Ag', name: 'NIVEA Deutschland' },
    { id: 'UCLoWcRy-ZjA-Erh0p_VDLjQ', name: 'Y-Kollektiv' },
    { id: 'UCLLibJTCy3sXjHLVaDimnpQ', name: 'ARTEde' },
    { id: 'UCZHpIFMfoJJ_1QxNGLJTzyA', name: 'MrWissen2go' },
    { id: 'UCIofxT-750lLxxdA5xSTafw', name: 'Deutsch lernen durch Hören' },
    { id: 'UCA3mpqm67CpJ13YfA8qAnow', name: 'Terra X History' },
    { id: 'UCMvmlvKoZV0vcM2kjLwOAbQ', name: 'BibleProject - Deutsch' },
    { id: 'UCsVWpmoRsNAWZb59b6Pt9Kg', name: 'MrWissen2go Geschichte | Terra X' },
    { id: 'UCTPAHk1b-h-WGQn9cfGlw2Q', name: 'NDR Doku' },
    { id: 'UC5ZnpdkQIit8TWhGVDiDnQQ', name: 'Hallo Deutschschule' },
    { id: 'UCKGMHVipEvuZudhHD05FOYA', name: 'Simplicissimus' },
    { id: 'UCXntXBt2YKBO1xDni0EgjXA', name: 'Slow German - lerne Deutsch mit Annik!' },
    { id: 'UC1w6pNGiiLdZgyNpXUnA4Zw', name: 'DER SPIEGEL' },
    { id: 'UCNclt7O1bO7hz8Mari68neg', name: 'Peppa Pig Deutsch - Offizieller Kanal' },
    { id: 'UCsxqCqZHE6guBCdSUEWpPsg', name: 'Dein Sprachcoach' },
    { id: 'UCUuab1dctZzN5ZmRmQnTzkg', name: 'WDR Doku' },
    { id: 'UC1XrG1M_hw8103zO2x-oivg', name: 'Galileo' },
    { id: 'UCuVbK_d3wh3M8TYUk5aFCiQ', name: 'DeutschLera' },
    { id: 'UCD6ZSn_HC8ScP-h96-bsVGw', name: 'HerrNewstime' },
    { id: 'UCyHDQ5C6z1NDmJ4g6SerW8g', name: 'MAITHINK X' },
    { id: 'UCXQtWe9386khJaGivyO-c-w', name: 'Lingster Academy' },
    { id: 'UCA3gSLdR0rWjvj7UcFWaGlQ', name: 'Richtig Deutsch sprechen' },
    { id: 'UCthmoIZKvuR1-KuwednkjHg', name: 'Deutsch mit Rieke' },
    { id: 'UCeVQK7ZPXDOAyjY0NYqmX-Q', name: 'Benjamin - Der Deutschlehrer' },
    { id: 'UCfa7jJFYnn3P5LdJXsFkrjw', name: 'STRG_F' },
    { id: 'UC2kuG2O3pr60xmclc2c6b4g', name: 'ARD Reisen' },
    { id: 'UC4WXYTBZerw4sFXEvIEsJIQ', name: 'Erschaffe dich neu' },
    { id: 'UCdXw5gSb93ZGITVBhTPTOYw', name: 'Flirt-Forschung' },
    { id: 'UCDW1yldFKWrfjrr78aP5Nkw', name: "Leeroy will's wissen!" },
    { id: 'UCLil9BlNCu-hZWKKBbcXtMA', name: 'schoolseasy' },
    { id: 'UCK6jlnWA8t-XgUxwZJJHkQA', name: 'SWR Doku' },
    { id: 'UC5E9-r42JlymhLPnDv2wHuA', name: 'Terra X Lesch & Co' },
    { id: 'UCZuFrqyZWfw_Zf0OnXWUXyQ', name: 'Bayerischer Rundfunk' },
    { id: 'UCI0hWVdovmSxItgRFfV86mw', name: 'Goethe-Institut' },
    { id: 'UC1Y7onDsPyfP-lu--SXF-ew', name: 'Quarks' },
    { id: 'UCFqcNI0NaAA21NS9W3ExCRg', name: 'ZDF heute-show' },
    { id: 'UCVF_W6X2BFOh6TPv1Efm9YQ', name: 'Lohnt sich das?' },
    { id: 'UC1xaY8XtSMaJN38RYJoGGCg', name: 'Deutsch mit Benjamin' },
    { id: 'UC-eOBd5CS7ED2HT5CBCuV7A', name: 'DeutschBlitz' },
    { id: 'UCCAI6jmeW5hWz2-jaLPqLUQ', name: 'Deutsch mit Marija' },
    { id: 'UCNCktfoFAXtXnMlhjyc9SPA', name: 'tomatolix' },
    { id: 'UCh_GQqobenO55IJ9sYZWndA', name: 'SRF Kultur Sternstunden' },
    { id: 'UCV6W8_nrWxJLQakqBHEvT3Q', name: 'reporter' },
    { id: 'UCCljzsYpepeNeY-nKPBKnhA', name: 'Hessischer Rundfunk' },
    { id: 'UC5sgxwQGzW8BFTqLSMrklJw', name: 'Die Frage' },
    { id: 'UCktv1vOcK5dl1m5K9-3oPgw', name: 'DeichStube' },
    { id: 'UCw0Ygh4XYRuCGPbSNpxQofA', name: 'Natural. Fluent. German.' },
    { id: 'UC_FbRs9OJRXyUFjEa7ug3gw', name: 'Sprachschule | Learn german fast' },
    { id: 'UC8Km0txKTlSPYIJF9HwPZMA', name: 'Learn German' },
    { id: 'UCBzai1GXVKDdVCrwlKZg_6Q', name: 'PULS Reportage' },
    { id: 'UC5jjaOwaYKbVzbJRQ9QjWTA', name: '37 Grad' },
    { id: 'UCfICLkXJnzcDDc3I7S6f9QA', name: 'MY GERMAN SHORT STORIES' },
    { id: 'UC9rwo-ES6aDKxD2qqkL6seA', name: 'Deutsch1' },
    { id: 'UCrt6X6pXNRl5rRxaKbzCrvw', name: 'Clixoom vorn mit e' },
    { id: 'UCNNEMxGKV1LsKZRt4vaIbvw', name: 'ZDF MAGAZIN ROYALE' },
    { id: 'UCF8znrDPAg1Axr3EJ49DKpQ', name: 'Learn German Easily' },
    { id: 'UCB3YIeai6Op7k3LA-BvsrgQ', name: 'dagilp_lbh' },
    { id: 'UCfTZ5BV0sYIJ8qmsCYyXRfg', name: 'Ausbildung.de' },
    { id: 'UCFRt9RF7ffBn2SBDvk1uSLA', name: 'Learn German Fast' },
    { id: 'UCN0QV2z7IGymTlzL46xxIjg', name: 'SimplyDeutsch' },
    { id: 'UCofSfa66enFy2YxiVDWkD2w', name: 'Logical Lemon' },
    { id: 'UCJVzIzmYjsjqOVK3e_ZbBxQ', name: 'Universität Leipzig' },
    { id: 'UCKq6oGY92vdNDm7OQebvvXA', name: 'ichkocheheute' },
    { id: 'UCWKEY-aEu7gcv5ayIpgrnvg', name: 'ZDFunbubble' },
    { id: 'UCth1cMdUPYVjXqiEFE7Di7Q', name: 'Deutsch lernen mit Dialogen' },
    { id: 'UC7FeuS5wwfSR9IwOPkBV7SQ', name: 'ZDFinfo Dokus & Reportagen' },
    { id: 'UCdFkj0fA6VYJaty-v8_avvg', name: 'SRF Dokus & Reportagen' },
    { id: 'UCaDFHuodTr4T1EAg5IXK0NQ', name: 'TRU DOKU' },
    { id: 'UCzdtr1q2eNmtc0z5lSPia_Q', name: 'Gute Arbeit Originals' },
    { id: 'UCn7wWR5KnpX_N6ZaBNuyVYw', name: 'WDR' },
    { id: 'UCIwSCv6vGH9lCDU1UB58qrA', name: 'Deutsch mit Lara' },
    { id: 'UC_VR3TNPnHUww01hn7uvcPA', name: 'Deutsch lernen mit uns | Learn German with us' },
    { id: 'UCPiI104i7lyG--fkr3LZTtA', name: 'Cinema Strikes Back' },
    { id: 'UCQNR5ZJ8fzyWPvsZGyAVORA', name: 'fröhlich Deutsch' },
    { id: 'UCYJ61XIK64sp6ZFFS8sctxw', name: 'Gronkh' },
    { id: 'UCeARcCUiZg79SQQ-2_XNlXQ', name: 'Finanzfluss' },
    { id: 'UCJ-9bH9B1KZuXO988Vd56AA', name: 'Deutsch verstehen' },
    { id: 'UCb-cM927p9tWkqmpOrBabOQ', name: 'Ultralativ' },
    { id: 'UCizZsr6YKuhSK9sct4U9KXQ', name: 'Wissenswert' },
    { id: 'UCeWYsa2ynPc0VNwqL-vF2wQ', name: 'follow me.reports' },
    { id: 'UC8iYkzcCfdgkmsgWE2UkGgg', name: 'Die Kirche des Allmächtigen Gottes' },
    { id: 'UCX998HotocxcmzvyXu8b6fA', name: 'NENA' },
    { id: 'UCjiJ1T_QPYhdtvbaOhIbYyg', name: 'Berge' },
    { id: 'UCcBtLnl3LeNVqep-_fU5_Hw', name: 'German Speaking Test' },
    { id: 'UCHmNfmKhIkfBMTrr5QU-gAQ', name: 'VisualPolitik DE' },
    { id: 'UCesjlAoEgN_Sz_cKTvKEmmw', name: 'Doktor Whatson' },
    { id: 'UCzsfkUFa1_4F4cZeSLv5dFQ', name: 'Niklas Steenfatt' },
    { id: 'UCtyU6E_Cbpd0k7Anta-ut5Q', name: 'Glücksdetektiv' },
    { id: 'UCq9LcynLXxw4khwAIT665rg', name: 'ARD Kinder und Familie' },
    { id: 'UCjhkuC_Pi85wGjnB0I1ydxw', name: 'extra 3' },
    { id: 'UC6C1dyHHOMVIBAze8dWfqCw', name: 'GameStar' },
    { id: 'UC6zXbTQEujMO-5CzyywlVDQ', name: 'Browser Ballett' },
    { id: 'UCOzqhzAIw4JTJIMkDTfLnkg', name: 'Paluten' },
    { id: 'UCooPit08nD5lkSjgc5Gjxqw', name: 'Sing mit mir - Kinderlieder' },
    { id: 'UC2BKi0lRr_0yYcgsR6GKGsA', name: 'Emiirbayrak' },
    { id: 'UCctbi1Jw2jiVhj2ogdwiFdA', name: 'Kinderlieder zum Mitsingen und Bewegen' },
    { id: 'UC1w25Dr5mYY-EKse9Tel-dQ', name: 'Paula Wolf Official' },
    { id: 'UCrwHae2jvK6EKj8rqJLy2Ww', name: 'Jessie Bluegrey' },
    { id: 'UCmxc6kXbU1J-0pR2F3wIx9A', name: 'laserluca' },
    { id: 'UC_CiTdr3FjC5LJYTRCaYe3Q', name: 'Vlad und Niki' },
    { id: 'UC80GNjQxqqukU5kzxVmHAjA', name: 'Dani Klieber' },
    { id: 'UCBnqM-sZxMRm2hnVo6wSQ8w', name: 'Bodycam & Blaulicht' },
    { id: 'UCA_DdzBmf5yNaxMpVGwZV4g', name: 'Mascha und der Bär' },
    { id: 'UCqne3vTrajqHT1MI-nZfwYA', name: 'Baby Berry Kinderlieder Welt' },
    { id: 'UCdo4IIRJlEaln7ZHZHzFNIw', name: 'Arazhul' },
    { id: 'UCOL10n-as9dXO2qtjjFUQbQ', name: 'KinoCheck' },
    { id: 'UCHfdTAyg5t4mb1G-3rJ6QsQ', name: 'BibisBeautyPalace' },
    { id: 'UCqwGaUvq_l0RKszeHhZ5leA', name: 'PietSmiet' },
    { id: 'UC9CdzSPg2DuZ2YSaflng3Hw', name: 'Benx' },
    { id: 'UCxLxvbyyN-Zl3yKFMaiuKug', name: 'Familie Hauser' },
    { id: 'UCXGPGV90SPduyn9LVX9s7Kw', name: 'Domtendo' },
    { id: 'UCfWtqPyBMG_7i33OeeNsZZw', name: 'GermanLetsPlay' },
    { id: 'UCaR5mgH9aZkswPQtjZ4DktA', name: 'iCrimax' },
    { id: 'UCgQVCt1BOrUiMezZIOIJSXg', name: 'Simone Ludwig | Floh im Ohr TV | Musikvermittlung' },
    { id: 'UCjnj320HjQex4EXsPbrNntg', name: 'Anna Strigl' },
    { id: 'UCTdvynmLeTfcaqc4k40b-dA', name: 'Lewinray' },
    { id: 'UCkEeiJNvcMyU5Hsw_WR63cA', name: 'Karina2you' },
    { id: 'UC-oQQHYahLG4o8ScyrTbo3g', name: 'Jindaoui' },
    { id: 'UC1-VOKyTJrgLiBeiJqzeIUQ', name: 'JP Performance GmbH' },
    { id: 'UCAJaqfNOQdfsoP_Yzq0-fEw', name: 'OMID MOUAZZEN' },
    { id: 'UCqiuFWHZ_4mjUU6cpqE57XA', name: 'Mohi__07' },
    { id: 'UCmwNHmYmoKGDP3WYspRwP8g', name: 'Marco Strecker' },
    { id: 'UCswHAbaWV6tsed5J5E8vBgg', name: 'Disney Kids Deutschland' },
    { id: 'UCo6utge9KpJI61gXe7ngUJQ', name: 'Richtiger Kevin' },
    { id: 'UCuRgL3U6ciuxe7MRlCtKjUg', name: 'Mamiversum' },
    { id: 'UCjRSLHUvYPFhvHYvBCFmcrw', name: 'StineundMarc' },
    { id: 'UCr3LVdbgOcW4NZEpo0VHnxw', name: 'Freshtorge' },
    { id: 'UCcn4UOBvB0W2HjCcLFLuu2w', name: 'ungespielt' },
    { id: 'UCQ_hHJ0uTbzFLHrk1XHGXtw', name: 'Standart Skill' },
    { id: 'UCTXeJ33DzXI2veQpKfrvaYw', name: 'Julien Bam' },
    { id: 'UCTiBw2QGvgl8tu2gf42rZ8g', name: 'yvonnedilauro' },
    { id: 'UC2Yo5HbL-A7uoYvcl7pl7Jg', name: 'rewinside' },
    { id: 'UCvI99nXr_PN3_kndf6AwujQ', name: 'Nick Jr. Deutschland' },
    { id: 'UCwDZDO-hFx6vMrODc8r5rJw', name: 'Raz Shorts' },
    { id: 'UCC5kum96eeAdJGfizULP4lw', name: "Germany's Next Topmodel" },
    { id: 'UC6UrlhHQXm9tWhZcFSfco8Q', name: 'How2Shirli' },
    { id: 'UCQU3PO2g_rmqbmr8VJWvrsA', name: 'Nickelodeon Deutschland' },
    { id: 'UC6zt1e6c9N4VaSBOhC1wV9g', name: 'Finnel' },
    { id: 'UCyZi66dRh_pb2_0fNW-ahvg', name: 'Thieniboy' },
    { id: 'UCOzhlS-OV7GbCIzO19cPL-w', name: 'Samsung Deutschland' },
    { id: 'UClCIWcZNvq15p0Y-E4ToGOw', name: 'sportstudio fußball' },
    { id: 'UC2Y_QKNXBWreJW4qkgTMKkA', name: 'Little Angel Deutsch - Kinderlieder' },
    { id: 'UCpdz6mZ_WUKlHBl-DnxoUlw', name: 'Disney Junior Deutschland' },
    { id: 'UCLHsaB11MF0reXL02JKnLPg', name: 'Noel Dederichs Shorts' },
    { id: 'UCw68lfxaH40S1rP6-ZwHhKw', name: 'Say Sayonara' },
    { id: 'UC6hmAN2FLzB8-Fzzu7evKgA', name: 'Berlin - Tag & Nacht' },
    { id: 'UCrDI6glxHE9BOFjQZfWmQtw', name: 'TooBad' },
    { id: 'UCABnItlZL3OypQVstotjt4w', name: 'Familie Vogel - Spiel mit mir' },
    { id: 'UCCpJyQTVvVU_qw92UpOaNRw', name: 'Verstehen Sie Spaß?' },
    { id: 'UC6Gc4KQ1ueDnh8x7plaAD3w', name: 'Trymacs' },
    { id: 'UCSfMSePxSvUG8bGAhqzLUVw', name: 'Die Crew' },
    { id: 'UCxDyK2G7WB6EpuarIKJoJPQ', name: 'Auf Streife' },
    { id: 'UCrev-dqCk0e1ig6HGZVB6Ow', name: 'WB Kids Deutschland' },
    { id: 'UCjzcAEdtPjSo3hRrhVnVaQg', name: 'MySpass Classics' },
    { id: 'UC2mthlhtYQyLiOKic1udu2g', name: 'Volkswagen Österreich' },
    { id: 'UCWCIIJRQImUtolnWZjcSB7Q', name: 'Knallerfrauen' },
    { id: 'UCswKpR2tL1OF-ym_YeFBysA', name: 'HeyKids - Kinderlieder TV' },
    { id: 'UCheky_SBEExtbK_T0onuDwg', name: 'AnnenMayKantereit' },
    { id: 'UCxTHCMaxURhapisCMBv8y0A', name: 'Plankton' },
    { id: 'UCj6mqrzXIg2xBiYvl9CsnxA', name: 'Klinik am Südring' },
    { id: 'UCEf5Y6UzFWnIB0VCAtyRtaw', name: 'ShowdownTV' },
    { id: 'UCG42F4hEt69Fud85Z988vKQ', name: 'Kelvin und Marvin' },
    { id: 'UCajyfb5EUPd3f3deUk0dBEQ', name: 'Mamiseelen' },
    { id: 'UCmoa-beOd9dBmZIiLVXB8Bw', name: 'Joko & Klaas' },
    { id: 'UCzvkuZPjOWirktNcu5liHRA', name: 'EarlyGame' },
    { id: 'UCGcheBSVngQt09ubb0BZyJw', name: 'myspass' },
    { id: 'UC8TkgoBWpKPb7VqSaUt8g5g', name: 'ViktoriaSarina' },
    { id: 'UCQM0bS4_04-Y4JuYrgmnpZQ', name: 'Chaosflo44' },
    { id: 'UCX71z-68tW3Pk5TW6EPKQgg', name: 'Julienco' },
    { id: 'UCyRgnhPqL5rm9FShbNZ_zYw', name: 'LukasBS' },
    { id: 'UC2JTZJAtJtckj2v0ETYsDHg', name: 'Feuerwehrmann Sam' },
    { id: 'UCHKVTtxg9yRJ_5KDMZFCkCw', name: 'Rebekah Wing' },
    { id: 'UC396W6k_KVygw0Vz87rRnfA', name: 'HAKIM-AMIR' },
    { id: 'UCVhZG7p4mnW4TlNFPSd9EdQ', name: 'Google Deutschland' },
    { id: 'UCZX_5XCRE_dZ_4tNXOEYtog', name: 'taff' },
    { id: 'UCSNfLYYlk8N6BIvznQ82vrQ', name: 'IsyCheesy' },
    { id: 'UCzMBzlAt1y6cPKCOD_u2hfw', name: 'DOKTOR LIGHT' },
    { id: 'UChr1sKJ27Fr6WZxAlusbo_w', name: 'Felix von der Laden' },
    { id: 'UC9YTp5M6yYgSd6t0SeL2GQw', name: 'HandOfBlood' },
    { id: 'UCgZpwegd4AdDlZNrIamIgRw', name: 'BastiGHG' },
    { id: 'UCkvtCxVKkWuoMHNip9AEBEA', name: 'LAMI' },
    { id: 'UCX4YLEV2sEVye1vLGPfBKTg', name: 'Bebefinn Deutsch - Kinderlieder' },
    { id: 'UCZ2rzCiLknwIQRNTUtPToiQ', name: 'julesboringlife' },
    { id: 'UCJLlzmRbgBvi7sDtv1WkwXg', name: 'Spielzeug Wunderland' },
    { id: 'UCrSZS36d39sB4kItL5odLgA', name: 'Like Nastya DE' },
    { id: 'UCWT-qQuNBk1KVpnoJ_39ROA', name: 'Laschakv' },
    { id: 'UCkBoq9BF-2fIdU4qWeZ5ogg', name: 'WUMMS' },
    { id: 'UCIgCb1dYprH140Ds0mgeAUA', name: 'Kontra K' },
    { id: 'UCw_T-wN5D_NbfwFp4ztQvBA', name: 'ApeCrime' },
    { id: 'UCpOjsfioBK7vgfT7AZXvx4A', name: 'EpicStun' },
    { id: 'UCmc4B7F5NEn22PVVK_vmjmw', name: 'Vanessa Zinner' },
    { id: 'UCak3selG2oi5vn7sbqdaULA', name: 'GRIP - Das Motormagazin' },
    { id: 'UC8JETzqWNyTnAtwaq0_dl9A', name: 'Schlager für Alle' },
    { id: 'UChnkF2An-DdGNByW38a4Xow', name: 'KinderLernTV' },
    { id: 'UCbXZYanZEfJ1xzwFcBOGm3Q', name: 'AviveHD' },
    { id: 'UCTTt7XB8w4e3D7OyGOTBR1g', name: 'wissensweb' },
    { id: 'UCcnmihb4u2dj4Z2RvOwA2uA', name: 'Kaan' },
    { id: 'UCl4pcgAsZtD980xFNDcGu7w', name: 'Freddy' },
    { id: 'UCzgmxZIlgfH1fgch7OpigIA', name: 'Troom Troom De' },
    { id: 'UCJs1mfRk0orBF9twGXaZA2w', name: 'Zombey' },
    { id: 'UCpZ_DI-ZugwMzXcqccaTVsg', name: 'Dagi Bee' },
    { id: 'UC6jGqtmHfNQiwKFxH__-rfA', name: 'Deutschland sucht den Superstar' },
    { id: 'UC53bIpnef1pwAx69ERmmOLA', name: 'Bares für Rares' },
    { id: 'UCrgoxldvOW1Lj6MRvbktdig', name: 'Team Paluten' },
    { id: 'UCppK6hGo5L-dmrryG5T0K0Q', name: 'SpontanaBlack' },
    { id: 'UCnWPDVXTezqRZMTqmnthgPg', name: 'DieLochis' },
    { id: 'UCJWR1juhKboZTtGn53-K0fw', name: 'Hilf Mir! Jung, pleite, verzweifelt' },
    { id: 'UCOTyb6e_v9cz2Bu7VzFW7tg', name: 'KeysJore' },
    { id: 'UCAOmPP7Xt9YmPYtjettV3oA', name: 'Liederkiste - Kinderlieder' },
    { id: 'UCRmdnsnElWlSHS5VM2kV4Uw', name: 'Caillou Deutsch - WildBrain' },
    { id: 'UCGWSzxsb4UXsQf_FRQ7rR1g', name: "Joey's Jungle" },
    { id: 'UCC2I-hHgLHQ4dTAaOhErRRQ', name: 'LukeMockridgeTV' },
    { id: 'UC-WPcXe_5VFIT-ykNed4o1A', name: 'Cornally' },
    { id: 'UC2sW_Oyqb0cbO1056Ciehnw', name: 'Imsem Diary' },
    { id: 'UCzK4mZybYjXr6kiPcSNwWJg', name: 'Haus des Meeres Aqua Terra Zoo' },
    { id: 'UCNJwYVhTNX23AULBnfwnc9A', name: 'Amazon Prime Video Deutschland' },
    { id: 'UC_EZd3lsmxudu3IQzpTzOgw', name: 'Held der Steine Inh. Thomas Panke' },
    { id: 'UCXJSbafdsnj24lGqCiIzssQ', name: 'Amazon.de' },
    { id: 'UCO4i3o2loPJ9T2FwDuBkkHQ', name: 'Samuel Singh' },
    { id: 'UCQqmBr_LOGGrO0OnmUER6Qw', name: 'HaoFX' },
    { id: 'UCZyKuSVPyd-l1bRYTfxbt4Q', name: 'Kinder Cartoons' },
    { id: 'UC2D5z27XfUz5DfU7kQAehiA', name: 'MIRACULOUS - Geschichten von Ladybug und Cat Noir' },
    { id: 'UCGh8WvsmJTI9m8eh6g2bwvQ', name: 'Pinkfong, Baby Hai! Kinderlieder' },
    { id: 'UCtB_uLeqDLR4vXZBNndqnzA', name: 'AlpaySanti' },
    { id: 'UClDXgkm1smT2y9ahO4aHYzQ', name: 'TordiShorts' },
    { id: 'UCeEZkty8XP1ey0na-JRdPJw', name: 'Diana & Anton' },
    { id: 'UCCa_tg3H8ExaLqbp-GPLjRA', name: 'Aditotoro Shorts' },
    { id: 'UC_aezIDOICl-ARlGWY9sVpA', name: 'HeyMoritz' },
    { id: 'UCmO35eVuAzdT1wlcUHHF8JA', name: 'Jindaouis' },
    { id: 'UCOiG4UoE0-CBZKlDVgw1eTA', name: 'Stonedeafproduction' },
    { id: 'UCwAxA_gDbnfE45J9msXd3yw', name: 'saturday.and.sunday' },
    { id: 'UCfnHPtNZw3Y02NIXYvue-ww', name: 'Isabell Faust' },
    { id: 'UCKTxEWvaNcCJP4lH8lsJdPg', name: 'SCHLAUSCHLEIM SAM' },
    { id: 'UCPj_Vtw0hKnhJapQuATBUrA', name: 'SPORT1' },
    { id: 'UCPqZp43m3Cg69JkvCvXh8Eg', name: 'Universal Pictures Germany' },
    { id: 'UCb1fLWd8U6CFZKtG7nU5_ag', name: 'Spass für Kinder' },
    { id: 'UCCJ-NJtqLQRxuaxHZA9q6zg', name: 'HandOfUncut' },
    { id: 'UCOY3VWW4NGQAue_rqTBtdhA', name: 'SPACE FROGS' },
    { id: 'UCPNqPbXJHMvrH3NwRKKR5IQ', name: 'Sallys Welt' },
    { id: 'UCWcgNhP-VJGyZcNCbJjx1jw', name: 'Marie Joan' },
    { id: 'UCHBovDZbOOvdrwEx6DIqjAw', name: 'Moonbug Kids - Deutsch' },
    { id: 'UC7PQc4num1U-hj9NbQsIanQ', name: 'Bibi & Tina TV' },
    { id: 'UCmZ981FlyCa4kFwuCxsd5ew', name: 'Jenni ⭐️' },
    { id: 'UCaOk62wTxkUPQSRxwmVB1Eg', name: 'myToolStore' },
    { id: 'UCXXX-uxRI9VOHAZ10f6o15Q', name: 'La La Lebensfreude' },
    { id: 'UCnY-8UapKurqxb0yNxneQfw', name: 'Achtung Kontrolle' },
    { id: 'UCgmHVWU9vo_Y4fiQSCfGGRw', name: 'Brotatos' },
    { id: 'UCvbR8mrSZ1BXf2LNnp-lGpw', name: 'Das Supertalent' },
    { id: 'UCczKrLf-GTXBo1ThoiILP0A', name: 'Made My Day' },
    { id: 'UCtjiRW7g8WFVg_tiFX-9gsA', name: '#Mentale Zuflucht' },
    { id: 'UCDjs-YnLzdYUREkCkLT4H1g', name: 'Lidl' },
    { id: 'UC40xkOfqcILW34IlfyGLMCQ', name: 'Spielzeugtester' },
    { id: 'UCzZ2N81E6ureM3slotgJfUw', name: 'YTITTY' },
    { id: 'UC6b8JxhhRAYtMkmVlDiZjZw', name: 'FionnTime' },
    { id: 'UC1w2HpXiRl5pbLGQEwnUl2w', name: 'XXXLutz Deutschland' },
    { id: 'UC4yRqBV0uoObt3PeZF8xQnA', name: 'KinderKlubTV' },
    { id: 'UClIlxtpf7y3CyfS-7y-lesg', name: 'LeKoopa' },
    { id: 'UCvRmbsKxcwoSTNQV17-0ytg', name: 'DieWalsers' },
    { id: 'UCiKvWEIIlfHKHx6BbkGtDsA', name: 'Lecker schnell' },
    { id: 'UCCJAkVzs_m_t5dNiWHeW-pA', name: 'JONAS SHORTS' },
    { id: 'UCQtsd17U8NOM1VRI8oxdwiQ', name: 'CHECKER WELT' },
    { id: 'UCkckVhg_uQfBEeBVFHoCraw', name: 'Echtso' },
    { id: 'UC9NinsG6GiC2QkHaPeZeIbA', name: 'Evelyn' },
    { id: 'UCweibQ2YdLhIdVWLCbcwmmg', name: 'Centex' },
    { id: 'UCiTydOPjFaDTkdygnFxAdaQ', name: 'Alphastein' },
    { id: 'UCHJBoCDxaCTRrwCHXEBA-BA', name: 'Mady Morrison' },
    { id: 'UClKrnA55xBh5WkMuVfeACYg', name: 'Polarlicht Kino' },
    { id: 'UCmMFR_377vB6LLkMFpB8QkA', name: 'Kids Tv Deutschland - Deutsch Kinderlieder' },
    { id: 'UCAC3bPgZf0vF6XBimmg_XtA', name: 'K. Tze' },
    { id: 'UCnGzJIUgwZmvixL5WzxIwbg', name: 'LUCREW' },
    { id: 'UCnVTsgPKj7tKrDAC2IsRp9A', name: 'Ruhrpottwache' },
    { id: 'UCqD3OnFZJmKxXPhM-ScDK4w', name: 'JONAS' },
    { id: 'UC7EAEkE8U2eNMdJlXhdXpjA', name: '70 Sekunden Wiki' },
    { id: 'UChY0uEZKBV5c0CplEA79Qyw', name: 'Sternschnuppenwerkstatt' },
    { id: 'UC2cJbBzyHM48MVFB6eOW9og', name: 'stern TV' },
    { id: 'UCtbmy36Z0gtHoJVDQZtBAuA', name: 'IDzock' },
    { id: 'UCWavuOpKwQH72kaEAkDNqyA', name: 'Merle Loosen' },
    { id: 'UCkaUcIDGRYtn0AxUez4wsIQ', name: 'AllesAva' },
    { id: 'UCRWSxXBnz9IRS4SgRhG2wpQ', name: 'Die Maus' },
    { id: 'UCaPUg4BWXUO6fKp8HmFA1Yw', name: 'ApeCrimeTV' },
    { id: 'UCXDi1F7Q-cJQ4mGGavtfYRQ', name: 'inscope21' },
    { id: 'UCy2jqVAql1FaJdQ2yV_k3Aw', name: 'Nikolaj Lupanov' },
    { id: 'UCq-_2vFBWlfkeyWJaEphMnQ', name: 'ItzJul Shorts' },
    { id: 'UC-4Tzd5lIRU7lcv7_5OO01Q', name: 'unsympathischTV' },
    { id: 'UCpHTv1eQBeSlrdmlh8C6ZxQ', name: 'DannyJesden' },
    { id: 'UCvv3SF2SzAAOAkvs_r7vEvA', name: 'Disney Deutschland' },
    { id: 'UC4oMBeMQWt_zJrbRQmhMxiw', name: 'Rick Azas' },
    { id: 'UCdCMAk4R3N7SrTyg1WHA2Nw', name: 'itzcouple' },
    { id: 'UCw2il95DXcigSOEosqL8izA', name: 'AgrarBlick' },
    { id: 'UCYxzaJcs6oNRhv0hnrmOqwg', name: 'LiDiRo' },
    { id: 'UCT8fbPYycfhjYzLbsU1dl3Q', name: 'ZDF Satire' },
  ],
}

export interface CatalogueVideo {
  videoId: string
  title: string
  channelId: string
  channelName: string
  published: number // ms
  views: number
  isShort: boolean
}

const first = (el: Element, tag: string) => el.getElementsByTagName(tag)[0]

/**
 * Latest videos of a channel. Each RSS feed has only 15 items, and on some channels most of
 * them are Shorts. So also read the feed of the channel's long-videos playlist (`UULF` + the
 * ID without `UC`).
 */
export async function fetchChannelVideos(channel: Channel): Promise<CatalogueVideo[]> {
  const [all, long] = await Promise.all([
    readFeed(channel, `channel_id=${channel.id}`),
    readFeed(channel, `playlist_id=UULF${channel.id.slice(2)}`).catch(() => []),
  ])
  const seen = new Set(all.map((v) => v.videoId))
  return [...all, ...long.filter((v) => !seen.has(v.videoId))]
}

async function readFeed(channel: Channel, query: string): Promise<CatalogueVideo[]> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?${query}`)
  if (!res.ok) throw new Error(`${channel.name}: HTTP ${res.status}`)
  const doc = new DOMParser().parseFromString(await res.text(), 'application/xml')
  return [...doc.getElementsByTagName('entry')].map((e) => ({
    videoId: first(e, 'yt:videoId')?.textContent ?? '',
    title: first(e, 'title')?.textContent ?? '',
    channelId: channel.id,
    channelName: channel.name,
    published: Date.parse(first(e, 'published')?.textContent ?? ''),
    views: Number(first(e, 'media:statistics')?.getAttribute('views') ?? 0),
    isShort: (first(e, 'link')?.getAttribute('href') ?? '').includes('/shorts/'),
  }))
}

const PHOTO_TTL = 30 * 86400_000

/**
 * Channel photo as a data URL, cached by channel for 30 days. The image itself is cached too:
 * YouTube lets the browser keep it for only 1 day. The RSS feed has no photo, so this reads
 * the `og:image` tag of the channel page. The page is large (the tag is about 800 KB in),
 * so it stops reading once the tag is found.
 */
export async function channelPhoto(id: string): Promise<string> {
  const key = `photo:${id}`
  const cached = (await chrome.storage.local.get(key))[key] as
    { url: string; at: number } | undefined
  // Older entries hold the remote URL, not the image: load them again.
  if (cached?.url.startsWith('data:') && Date.now() - cached.at < PHOTO_TTL) return cached.url
  // ucbcb=1: in the EU, without it the page redirects to consent.youtube.com (no CORS access).
  const res = await fetch(`https://www.youtube.com/channel/${id}?ucbcb=1`)
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let html = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) throw new Error('No og:image on channel page')
    html += value
    const found = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1]
    if (!found) continue
    void reader.cancel()
    const img = await fetch(found.replace(/=s\d+/, '=s88')) // the page links a 900 px image
    if (!img.ok) throw new Error(`HTTP ${img.status}`)
    const url = await dataUrl(await img.blob())
    await chrome.storage.local.set({ [key]: { url, at: Date.now() } })
    return url
  }
}

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export type TrackInfo = Pick<CaptionTrack, 'languageCode' | 'kind'>

const TRACKS_TTL = 7 * 86400_000

/**
 * Caption tracks of a video, cached by video for 7 days. No API gives them without a login,
 * so this reads the player data in the watch page. The data is about 750 KB in, so it stops
 * reading once the data is found.
 */
export async function videoTracks(id: string): Promise<TrackInfo[]> {
  const key = `tracks:${id}`
  const cached = (await chrome.storage.local.get(key))[key] as
    { tracks: TrackInfo[]; at: number } | undefined
  if (cached && Date.now() - cached.at < TRACKS_TTL) return cached.tracks
  const res = await fetch(`https://www.youtube.com/watch?v=${id}&ucbcb=1`)
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let html = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) throw new Error('No player data on watch page')
    html += value
    // `captions` comes before `videoDetails` in the player data. No `captions`: no tracks.
    const start = html.indexOf('ytInitialPlayerResponse = ')
    const end = start < 0 ? -1 : html.indexOf('"videoDetails":', start)
    if (end < 0) continue
    void reader.cancel()
    const data = html.slice(start, end)
    const json = data.match(/"captionTracks":(\[.*?\]),"audioTracks"/)?.[1]
    const all = json
      ? (JSON.parse(json) as CaptionTrack[]).map(({ languageCode, kind }) => ({
          languageCode,
          kind,
        }))
      : []
    const audio = [...data.matchAll(/"audioTrack":(\{[^{}]*\})/g)].map(
      (m) => JSON.parse(m[1]!) as AudioTrack,
    )
    const tracks = dropDubbed(all, audio)
    await chrome.storage.local.set({ [key]: { tracks, at: Date.now() } })
    return tracks
  }
}
