# LAST WORLD — อาชีพขั้นสอง เลเวล 50 และองก์ 3

สถานะ: แผน (ยังไม่เริ่มทำ) · เขียน 2026-11-18 · ทุกอย่างในไฟล์นี้ตกลงกับเจ้าของเกมแล้ว ยกเว้นที่เขียนว่า "ข้อเสนอ"
ไฟล์นี้คือรายการงานทั้งหมด ทำตามลำดับในข้อ 12 และติ๊กในข้อ 13 เมื่อเสร็จและทดสอบผ่าน

## 1. สิ่งที่ตกลงแล้ว

| เรื่อง | ตกลง |
|---|---|
| เพดานเลเวล | 30 → **50** |
| เปลี่ยนอาชีพ | ที่เลเวล 30 · เลือกได้ 1 จาก 2 สาย · **เปลี่ยนกลับไม่ได้** |
| ความสามารถติดตัวของอาชีพ | **ไม่มี** ความเก่งมาจาก skill tree ใหม่ที่ผู้เล่นเลือกเอง และจากการ์ดใหม่ |
| การ์ดอาชีพเดิม | ใช้ต่อได้ และอัปเกรดต่อได้ |
| การ์ดใหม่ | อาชีพละ 12 ใบ (Common 5 · Rare 4 · Epic 2 · Legendary 1) รวม 144 ใบ |
| ตอนเปลี่ยนอาชีพ | ได้ Common 3 ใบของอาชีพใหม่ทันที ใส่เด็คให้ |
| VFX | การ์ดอาชีพขั้นสองทุกใบมีเอฟเฟกต์ของตัวเอง ใหญ่กว่าเดิม · Legendary แต่ละอาชีพมีท่าไม้ตายเต็มจอที่ไม่ซ้ำกัน (ข้อ 6) |
| co-op | คนเลเวลสูงเก่งกว่าได้ ไม่ปรับให้เท่ากัน |
| ชื่ออาชีพ | ใช้ตำแหน่งหรือฉายา ไม่ใช่คำอธิบายตรง ๆ (ข้อ 2) |
| ด่านใหม่ | 12–17 อยู่บน **แผนที่โลกหน้า 2** · ด่าน 17 เป็นตอนจบใหญ่ และปูทางไปต่อ |
| การแจ้งเตือน | ถึงเลเวล 30 มีแจ้งเตือนแบบเลเวลอัป · ของชิ้นใหม่โผล่ในกระเป๋า · เปิดแล้วเข้าเมนูเลือกอาชีพ |
| หน้าสร้างตัวละคร | กดดูได้ว่าอาชีพนี้จะเป็นอะไรได้บ้างในขั้นสอง |

## 2. อาชีพทั้ง 12

`cls` ของฮีโร่ยังเป็นอาชีพแรกเหมือนเดิม (การ์ด อุปกรณ์ ค่าสถานะพื้นฐานไม่เปลี่ยน) เพิ่ม `hero.job` = id อาชีพขั้นสอง หรือ null

| อาชีพแรก | id | อาชีพขั้นสอง | สี | วิธีเล่น |
|---|---|---|---|---|
| Knight | `lordknight` | **Lord Knight** | เหล็กเข้ม + แดง | บุกทะลวง หอก พุ่งผ่านศัตรูเป็นแถว |
| Knight | `paladin` | **Paladin** | ขาว + ทอง | ปกป้องเพื่อน โล่ศักดิ์สิทธิ์ ดาบแสง |
| Mage | `sorcerer` | **Sorcerer** | แดง + ฟ้า | ไฟกับน้ำแข็ง ระเบิดวงกว้าง ละลาย/แช่แข็ง |
| Mage | `warlock` | **Warlock** | ม่วง + ดำ | คำสาป (Curse) ดูดชีวิต บั่นทอนช้า ๆ |
| Archer | `marksman` | **Marksman** | น้ำตาล + เขียว | ยิงไกล คริติคอล ปิดฉากทีละตัว |
| Archer | `ranger` | **Ranger** | เขียวป่า + ขนสัตว์ | เหยี่ยว กับดัก พิษ ตรึงศัตรู |
| Assassin | `reaper` | **Reaper** | ดำ + สีกระดูก | เคียว ปิดฉากศัตรูเลือดน้อย ฆ่าแล้วได้แรงต่อ |
| Assassin | `venomancer` | **Venomancer** | เขียวพิษ + ดำ | พิษหลายชั้น แพร่พิษ ระเบิดพิษ |
| Priest | `bishop` | **Bishop** | ขาว + ทองอุ่น | ฮีลหมู่ ชุบชีวิต เกราะ |
| Priest | `monk` | **Monk** | ขาว + ฟ้า + ทอง | หมัด ตีรัว ยิ่งเล่นการ์ดมากในเทิร์นยิ่งแรง |
| Blacksmith | `engineer` | **Engineer** | ทองเหลือง | ปืนใหญ่ เสาโล่ ระดมยิง |
| Blacksmith | `forgemaster` | **Forgemaster** | เหล็กเรืองไฟ + ส้ม | ค้อนยักษ์ ทำลายเกราะ ไฟ ลาวา |

### รูปร่าง (ดูจากเงาก็รู้ว่าเป็นอาชีพไหน)
วาดด้วยโค้ดใน `src/engine/chibi.js` เหมือนเดิม (ชาย/หญิง) แต่ละอาชีพมีชิ้นเด่นหนึ่งชิ้นที่อาชีพแรกไม่มี

| อาชีพ | ชิ้นเด่น | ชุด |
|---|---|---|
| Lord Knight | หอกยาว + หมวกเหล็กมีพู่สูง | เกราะเข้ม บ่าเกราะใหญ่ ผ้าคลุมแดงยาว |
| Paladin | โล่บานใหญ่ลายดวงอาทิตย์ + หมวกมีปีก | เกราะขาวทอง ดาบเรือง |
| Sorcerer | ลูกแก้วไฟกับน้ำแข็งลอยวนรอบมือ · ไม่มีหมวก ผมพลิ้ว | เสื้อคลุมคอตั้ง ซีกแดงซีกฟ้า |
| Warlock | ฮู้ดมีเขา + คัมภีร์ล่ามโซ่ | ม่วงดำ ผ้าคลุมขาดรุ่ย ตาเรือง |
| Marksman | ธนูยาวสูงกว่าตัว + หมวกปีกมีขนนก | โค้ตยาว แว่นเล็งตาเดียว |
| Ranger | เหยี่ยวเกาะบ่า + ฮู้ดหนังหมาป่า | ผ้าคลุมขนสัตว์ ธนูสั้น |
| Reaper | เคียวยักษ์ | ผ้าคลุมดำ หน้ากากกะโหลก |
| Venomancer | หน้ากากกันพิษมีท่อ + ขวดยาห้อยเอว | เขียวดำ ถุงมือกรงเล็บ |
| Bishop | หมวกยอดสูง + ไม้เท้าปลายงอ | เสื้อคลุมยาวขาวทอง |
| Monk | ไม่มีอาวุธ มือพันผ้า ลูกประคำ ผ้าคาดหัว | ชุดผ้าเรียบขาว-ฟ้า-ทอง (ไม่ใช้เหลืองส้ม เพื่อไม่ให้เหมือนพระสงฆ์จริง) |
| Engineer | เครื่องจักรสะพายหลังมีแขนกล | ทองเหลือง แว่นตา เข็มขัดเครื่องมือ |
| Forgemaster | ค้อนสองมือขนาดยักษ์เรืองแสง | เกราะหนัก รอยแตกเรืองไฟ |

## 3. เลเวล 50 และแต้ม

- `MAX_LEVEL` = 50 · สูตร XP ต่อเลเวลใช้ของเดิม `round(40·L^1.45 + 20)` (เลเวล 30→50 ใช้ XP รวม 166,810)
- ทุกเลเวล +1 stat point · ทุกเลเวลคู่ +1 skill point (เหมือนเดิม) · เลเวล 50 มี skill point รวม 25
- **ต้องเปลี่ยนอาชีพก่อนถึงจะเกินเลเวล 30 ได้** ระหว่างยังไม่เปลี่ยน XP ไม่สะสม (เหมือนตันตอนนี้) และหน้าสรุปผลบอกว่า "เปลี่ยนอาชีพเพื่อเติบโตต่อ"
- **แก้บั๊ก:** หน้าแจ้งเตือนเลเวลอัปบอก +3 stat points ต่อเลเวล แต่ได้จริง +1 (`exploreUI.js:413`)
- ข้อมูลจริง (Firebase, 2026-11-18): จบด่าน 6 ที่เลเวล ~15 · คำนวณได้ว่าจบด่าน 10–11 ที่เลเวล ~30 → เปลี่ยนอาชีพพร้อมกับเริ่มองก์ 3 พอดี
- **ต้องปรับตอนทำด่าน 12–17:** ถ้าใช้สูตร XP มอนสเตอร์เดิมต่อ ผู้เล่นจะได้ถึง ~63 ต้องตั้ง XP ด่านใหม่ให้จบด่าน 17 ที่เลเวล ~48–50 (เป้า: จบด่าน 12 ≈ 34 · 13 ≈ 37 · 14 ≈ 40 · 15 ≈ 43 · 16 ≈ 46 · 17 ≈ 49)

## 4. การเปลี่ยนอาชีพ (หน้าจอและขั้นตอน)

1. **ถึงเลเวล 30** — หน้าสรุปผลต่อสู้ แสดงแถบพิเศษต่อจากเลเวลอัป เสียงและแสงใหญ่กว่า: "A new name calls you" / "ชื่อใหม่กำลังเรียกหาเจ้า"
2. **ของในกระเป๋า** — ได้ไอเทมกุญแจ `job_page` "Page of Your Name" / "หน้ากระดาษที่มีชื่อเจ้า" (วาดด้วยโค้ด) ไอคอนกระเป๋าขึ้นจุดแดงจนกว่าจะเปิด · มี toast ตอนได้
3. **เปิดของ** — เมนูเลือกอาชีพ (กระดาษครีมตาม ui-style): สองคอลัมน์ แต่ละฝั่งมี
   - ตัวละครชุดใหม่ขยับท่า cast
   - ชื่ออาชีพ + หนึ่งประโยคบอกวิธีเล่น
   - การ์ด 3 ใบที่จะได้ (กดดูขยายได้) + ภาพการ์ด Legendary ประจำอาชีพ (ล็อกไว้ บอกว่าหาได้ที่ไหน)
   - ชื่อสาย skill tree ทั้ง 3 สาย
4. **ยืนยันสองครั้ง** — ครั้งที่สองเขียนชัดว่า "เปลี่ยนกลับไม่ได้"
5. **ฉากสั้น** — ตัวละครยืนกลางแสงสีของอาชีพ ชุดเปลี่ยน ได้การ์ด 3 ใบ (ข้อ 9 ฉาก J)
6. **หลังเปลี่ยน** — สมุดบันทึกแท็บ Skills แสดง tree ใหม่ใต้ tree เดิม · ชื่ออาชีพแสดงทุกที่ที่เคยแสดงอาชีพแรก (ห้องปาร์ตี้ การ์ดตัวละคร ฯลฯ)

กติกา:
- เปลี่ยนได้เฉพาะนอกการต่อสู้ (หน้าแผนที่โลก หรือระหว่างสำรวจ) · ใน co-op ก็เหมือนกัน
- ไม่บังคับให้เลือกทันที เก็บของไว้ก่อนได้
- ใน co-op เพื่อนเห็นชุดใหม่ทันทีที่ส่งข้อมูลฮีโร่รอบถัดไป (ไม่เพิ่มการอ่าน/เขียน Firebase: ข้อมูลฮีโร่ส่งอยู่แล้ว)

### หน้าสร้างตัวละคร
ใต้คำอธิบายอาชีพ มีป้ายเล็ก "Advanced classes at Lv 30" + สองชื่อ กดแล้วเปิดแผ่นกระดาษแสดงทั้งสองอาชีพ (ตัวละครชุดใหม่ + ประโยคบอกวิธีเล่น + Legendary ประจำอาชีพ) ใช้ชิ้นส่วนเดียวกับเมนูเลือกอาชีพ แต่ไม่มีปุ่มเลือก

## 5. Skill tree ของอาชีพขั้นสอง

- แต่ละอาชีพมี 3 สาย × 4 ขั้น = 12 ช่อง · ราคา ขั้น 1–2 = 1 แต้ม, ขั้น 3 = 2, ขั้น 4 = 3 → สายละ 7 แต้ม รวม 21
- แต้มที่มีให้ใช้: เหลือจาก tree แรก 7 + เลเวล 31–50 อีก 10 = **~17** → เต็มได้สองสายกับอีกนิด ต้องเลือก
- เปิดให้ลงได้หลังเปลี่ยนอาชีพ · tree แรกยังลงต่อได้
- ห้ามเพิ่ม Action Slot ใน tree ใหม่ (tree แรกมี +1 แล้ว)
- ชนิดผลใหม่ที่ต้องเขียนใน `computeStats` / ตัวคำนวณการ์ด:
  - `cardMod {job|cat|el|ids, dmg, block, heal, stacks, dice, range, cd, mp}` — แก้การ์ดที่ตรงเงื่อนไข (เป็นของที่ทำให้ tree "เปลี่ยนการ์ด" ไม่ใช่แค่บวกตัวเลข)
  - `startStatus {st: n}` — เริ่มการต่อสู้พร้อมสถานะ (รวม startBlock/startStrength เดิมเป็นแบบทั่วไป)
  - ที่เหลือใช้คีย์เดิม: atk matk def hp mp move crit eva critDmg lifesteal statusBonus elemPct thorns teamBlock healPct draw mpRegen turretBonus rangeBonus

ตาราง: **ขั้น1 / ขั้น2 / ขั้น3 / ขั้น4** ของแต่ละสาย

**Lord Knight**
- Lance: +1 ATK / การ์ด Lord Knight ระยะ +1 / การ์ดที่มี Trample ผลัก +1 / การ์ดโจมตี Lord Knight +1 ลูกเต๋า
- Vanguard: +1 Move / เริ่มด้วย Haste 1 / +20% critDmg / การ์ด movement ของ Lord Knight ให้ Strength 1 ตัวเองด้วย (`cardMod` เพิ่มสถานะ)
- Warlord: +4 HP / การ์ด buff ของ Lord Knight +1 stack / เริ่มด้วย Block 3 / Thorns +2 (passive `thorns` เดิม)

**Paladin**
- Aegis: +1 DEF / การ์ด defense +1 Block / เพื่อนเริ่มด้วย Block 2 (teamBlock) / การ์ด defense Paladin +1 ลูกเต๋า
- Zeal: +1 ATK / การ์ด holy +15% (elemPct holy) / การ์ดโจมตี Paladin ใส่ Weak +1 stack / Holy +25%
- Mercy: +5 HP / ฮีล +20% / เริ่มด้วย Regen 2 / การ์ดฮีล Paladin +1 ลูกเต๋า

**Sorcerer**
- Pyre: +1 MATK / Burn +1 stack / การ์ดไฟ Sorcerer +1 ดาเมจ / Fire +30%
- Rime: +10 MP / Chill +1 stack / การ์ดน้ำแข็ง Sorcerer ระยะ +1 / Melt/Quench +50% (comboPct)
- Focus: +2 MP regen / การ์ด Sorcerer ใช้ MP −1 / การ์ด Epic ของ Sorcerer cd −1 / การ์ด area ของ Sorcerer +1 ลูกเต๋า

**Warlock**
- Malice: +1 MATK / Curse +1 stack / การ์ด Warlock ใส่ Weak +1 / Shadow +30%
- Hunger: +4 HP / ดูดชีวิต 10% (lifesteal) / การ์ด drain ของ Warlock ดูด +20% / lifesteal +15%
- Pact: +15 MP / การ์ด Warlock ใช้ MP −1 / เริ่มด้วย Strength 1 / การ์ด Warlock +1 ลูกเต๋า

**Marksman**
- Precision: +10% crit / +1 range ยิงไกล (rangeBonus) / +30% critDmg / การ์ด Marksman +1 ลูกเต๋า
- Patience: +1 ATK / การ์ดที่มี `far` +1 ดาเมจ / เริ่มด้วย Strength 2 / Mark ไม่หายหลังโดน 1 ครั้ง (keepMark ทุกการ์ด Marksman)
- Mobility: +1 Move / +8% evasion / การ์ด movement Marksman จั่ว +1 / เริ่มด้วย Haste 2

**Ranger**
- Falconry: เหยี่ยว HP +50% / เหยี่ยวใส่ Mark / เหยี่ยวดาเมจ +50% (turretBonus ใช้กับ hawk) / การ์ด Ranger ที่เรียกเหยี่ยว cd −1
- Trapper: Root +1 stack (statusBonus root) / การ์ด Root ของ Ranger +1 ดาเมจ / Poison +1 stack / การ์ด area Ranger +1 ลูกเต๋า
- Wilds: +1 Move / +4 HP / เริ่มด้วย Haste 1 / Wind +30%

**Reaper**
- Harvest: +1 ATK / execute ของการ์ด Reaper เกณฑ์ +10% / +10% crit / การ์ดที่มี onKill ได้ผลสองเท่า
- Shroud: +8% evasion / เริ่มด้วย Stealth / การ์ด Reaper ใส่ Bleed +1 / lifesteal 15%
- Doom: +1 Move / Shadow +15% / การ์ด Reaper ระยะ +1 / การ์ด Reaper +1 ลูกเต๋า

**Venomancer**
- Toxin: Poison +1 stack / การ์ด Venomancer ใส่ Poison +1 / Poison +1 stack อีก / การ์ด perStatus poison +1 ต่อ stack
- Miasma: การ์ด area ของ Venomancer +1 ดาเมจ / Weak +1 stack / เริ่มด้วย Thorns 2 / การ์ด Venomancer +1 ลูกเต๋า
- Antitoxin: +5 HP / +1 DEF / เริ่มด้วย Regen 2 / ผู้ใช้ไม่โดนพิษ (passive immunePoison: ต้องเขียนใหม่ 1 hook)

**Bishop**
- Grace: ฮีล +20% / การ์ดฮีล Bishop +1 / Regen +1 stack / การ์ดฮีล Bishop +1 ลูกเต๋า
- Bastion: +1 DEF / teamBlock 2 / การ์ด defense Bishop +1 Block / การ์ด revive +20% HP
- Judgment: +1 MATK / Holy +20% / การ์ดโจมตี Bishop ใส่ Vulnerable +1 / Holy +30%

**Monk**
- Fist: +1 ATK / การ์ดที่มี hits ตี +1 ครั้ง (cardMod hits) / +10% crit / การ์ดโจมตี Monk +1 ลูกเต๋า
- Flow: +1 Move / perPlayed +1 / เริ่มด้วย Haste 1 / +8% evasion
- Spirit: +4 HP / +1 DEF / เริ่มด้วย Block 3 / Holy +30%

**Engineer**
- Artillery: turretBonus +30% / ปืนใหญ่ระยะ +1 / การ์ด area Engineer +1 ดาเมจ / turretBonus +50%
- Fortify: สิ่งก่อสร้าง HP +50% / เสาโล่ให้ Block +1 / เริ่มด้วย Block 2 / teamBlock 2
- Tinker: +10 MP / การ์ด Engineer cd −1 สำหรับ summon / การ์ด Engineer ใช้ MP −2 / draw +1 ต่อรอบ

**Forgemaster**
- Hammer: +1 ATK / การ์ด breakBlock +2 ดาเมจ / การ์ดโจมตี Forgemaster +1 ลูกเต๋า / Earth +30%
- Furnace: Burn +1 stack / Fire +20% / การ์ดไฟ Forgemaster +1 ดาเมจ / Fire +30%
- Anvil: +6 HP / +1 DEF / เริ่มด้วย Strength 2 / Thorns 2

> ตัวเลขทั้งหมดจะปรับอีกรอบในขั้นทดสอบสมดุล (ข้อ 12 ขั้น 6)

## 6. การ์ด 144 ใบ

รูปแบบ: `ชื่อ` (rarity · cost/MP/CD · เป้า) — ผล · ★ = 1 ใน 3 ใบที่แจกตอนเปลี่ยนอาชีพ
ค่าเริ่มต้น: Common cost 1 · ดาเมจ v = ค่าบวกบนลูกเต๋า (ใช้ระบบเดิม) · id ขึ้นต้นด้วยตัวย่ออาชีพ เช่น `lk_`
ระดับพลัง: Common แรงกว่า Common อาชีพแรกเล็กน้อย · Legendary แรงเท่าการ์ดรางวัลบอสระดับ Legendary (cost 3 · MP 10–12 · CD 5)

### กลไกใหม่ (ต้องเขียนใน `combat.js` ก่อนใช้)
| กลไก | ใช้กับ | ทำอะไร |
|---|---|---|
| `trample` | Lord Knight | พุ่งไปสุดแนวเส้น ตีทุกตัวที่ผ่าน หยุดหน้าสิ่งกีดขวาง |
| สถานะ `curse` | Warlock | โดนตีทุกครั้งเสีย +1 ต่อ stack ลดลง 1 ต่อเทิร์น |
| `onKill {energy\|draw\|heal}` | Reaper, Marksman | ถ้าการ์ดนี้ฆ่าได้ ได้ผลเพิ่ม |
| `perPlayed v` | Monk | +v ดาเมจ ต่อการ์ดที่เล่นไปแล้วในเทิร์นนี้ |
| summon `hawk` | Ranger | สัตว์บิน ไม่ขยับ ทุกรอบโจมตีศัตรูใกล้สุดในระยะ 4 ด้วยลม และใส่ Mark |
| summon `cannon` | Engineer | ยิงศัตรูในแนวเส้นระยะ 5 ทุกรอบ |
| summon `pylon` | Engineer | ทุกรอบให้ Block 2 กับเพื่อนที่ติดกัน |
| passive `immunePoison` | Venomancer tree | ไม่โดนพิษ |

### Lord Knight (`lk_`, cls knight, job lordknight)
- ★ Lance Thrust (C · 1/0/0 · ศัตรู ระยะ 2) — ดาเมจ v2
- ★ Spur Charge (C · 1/0/1 · ระยะ 3, movement) — dash, ดาเมจ v1
- ★ Impale (C · 1/0/1 · ระยะ 2) — ดาเมจ v1, Bleed 2, Root 1
- War Banner (C · 1/0/3 · รอบตัว 2 เพื่อน) — Strength 1, Haste 1
- Halberd Sweep (C · 2/0/2 · cone 2) — ดาเมจ v1, ผลัก 1
- Trample (R · 2/0/2 · เส้น 4) — trample, ดาเมจ v2
- Brace the Spear (R · 1/0/2 · ตัวเอง) — Block 2, Thorns 2
- Skewer (R · 2/0/2 · เส้น 2) — ดาเมจ v2, Vulnerable 2
- Momentum (R · 0/0/3 · ตัวเอง) — +1 Action Slot, Haste 1
- Dragoon Leap (E · 3/6/3 · area r1 ระยะ 4) — ดาเมจ v3, Stun 1
- Unbroken Line (E · 2/6/4 · รอบตัว 2 เพื่อน) — Block 3, Strength 2
- **Thousand-Lance Charge** (L · 3/10/5 · เส้น 6) — trample, ดาเมจ v4, Bleed 2, ผลัก 1

### Paladin (`pa_`, holy)
- ★ Sacred Blade (C · 1/0/0) — ดาเมจ v1 holy, Block 1 ตัวเอง
- ★ Shield of Faith (C · 1/0/1 · เพื่อน ระยะ 3) — Block 3
- ★ Consecrate (C · 1/0/2 · รอบตัว 1) — ดาเมจ v1 holy, Weak 1
- Lay on Hands (C · 1/0/2 · เพื่อน ระยะ 1) — ฮีล v3
- Oath of Light (C · 0/0/3 · ตัวเอง) — Cleanse, Regen 2
- Aegis Bond (R · 1/0/2 · เพื่อน ระยะ 3) — Block 3 ให้เพื่อน, Block 2 ตัวเอง
- Hammer of Dawn (R · 2/0/2) — ดาเมจ v2 holy, Stun 1
- Holy Ground (R · 2/4/3 · รอบตัว 2 เพื่อน) — Regen 3, Block 1
- Retribution Aura (R · 1/0/3 · ตัวเอง) — Thorns 3, Fortify
- Divine Shield (E · 2/8/4 · รอบตัว 2 เพื่อน) — Block 4, Cleanse
- Crusader Strike (E · 2/0/3 · charge) — ดาเมจ v3 holy, Vulnerable 2
- **Judgment of Heaven** (L · 3/12/5 · area r2 ระยะ 5) — ดาเมจ v4 holy, Weak 2, Stun 1

### Sorcerer (`so_`, fire/ice, MATK)
- ★ Flame Lash (C · 1/0/0 · ระยะ 4) — ดาเมจ v2 fire, Burn 1
- ★ Rime Spear (C · 1/0/1 · ระยะ 4) — ดาเมจ v1 ice, Chill 2
- ★ Steam Burst (C · 1/0/1 · ระยะ 4) — ดาเมจ v1 fire, +2 ต่อ Chill บนเป้า (ลบออก)
- Mana Ward (C · 1/0/2 · ตัวเอง) — Block 2, +4 MP
- Ember Field (C · 1/0/2 · area r1 ระยะ 4) — Burn 2
- Firestorm (R · 2/4/2 · area r1 ระยะ 4) — ดาเมจ v2 fire, Burn 2
- Glacier (R · 2/4/2 · เส้น 4) — ดาเมจ v1 ice, Chill 2, Root 1
- Attunement (R · 0/0/3 · ตัวเอง) — +1 Action Slot, +6 MP
- Frostfire Bolt (R · 2/4/2 · ระยะ 5) — ดาเมจ v2 fire, Burn 2, Chill 2
- Inferno (E · 3/8/4 · รอบตัว 2) — ดาเมจ v3 fire, Burn 3
- Absolute Zero (E · 3/8/4 · area r2 ระยะ 5) — ดาเมจ v2 ice, Frozen, Chill 2
- **Cataclysm** (L · 3/12/5 · area r2 ระยะ 6) — ดาเมจ v4 fire, Burn 2, Chill 2

### Warlock (`wl_`, shadow, MATK)
- ★ Hex Bolt (C · 1/0/0 · ระยะ 4) — ดาเมจ v1 shadow, Curse 2
- ★ Siphon (C · 1/0/1 · ระยะ 3) — ดาเมจ v1 shadow, ดูด 50%
- ★ Dark Pact (C · 0/0/2 · ตัวเอง) — เสีย 2 HP, +6 MP, จั่ว 1
- Wither (C · 1/0/1 · ระยะ 4) — Weak 2, Curse 1
- Shadow Grasp (C · 1/0/2 · ระยะ 4) — ดึง 2, Root 1
- Agony (R · 2/0/2 · ระยะ 4) — ดาเมจ v0, +2 ต่อ Curse บนเป้า
- Spreading Curse (R · 1/3/2 · ระยะ 4) — Curse 2, แพร่ Curse ไปตัวข้าง ๆ
- Blood Ritual (R · 1/0/3 · ตัวเอง) — เสีย 3 HP, +1 Action Slot, จั่ว 1
- Soul Leech (R · 2/4/2 · รอบตัว 1) — ดาเมจ v1 shadow, ดูด 50%
- Doom (E · 2/6/4 · ระยะ 5) — Curse 5, Vulnerable 2
- Abyssal Chains (E · 3/8/4 · area r1 ระยะ 4) — ดาเมจ v2 shadow, Root 2, Curse 2
- **Eclipse** (L · 3/12/5 · รอบตัว 3) — ดาเมจ v3 shadow, ดูด 50%, Curse 3

### Marksman (`mk_`, ATK)
- ★ Steady Shot (C · 1/0/0 · ระยะ 6) — ดาเมจ v2, crit +15%
- ★ Spotter's Mark (C · 0/0/1 · ระยะ 7) — Mark, Vulnerable 1
- ★ Ricochet (C · 1/0/1 · ระยะ 5) — ดาเมจ v0 ×2
- Reposition (C · 1/0/2 · hex ระยะ 3) — เดิน 3, จั่ว 1
- Crippling Shot (C · 1/0/1 · ระยะ 5) — ดาเมจ v1, Root 1, Weak 1
- Piercing Bolt (R · 2/0/2 · เส้น 6) — ดาเมจ v2, +2 จากระยะ 4 ขึ้นไป
- Deadeye (R · 1/0/3 · ตัวเอง) — Strength 3, จั่ว 1
- Kill Shot (R · 2/0/2 · ระยะ 6) — ดาเมจ v1, สองเท่าเมื่อเป้า < 30%, onKill +1 Action Slot
- Suppressing Fire (R · 2/0/2 · area r1 ระยะ 5) — ดาเมจ v0, Weak 2
- Armor Breaker (E · 2/0/3 · ระยะ 6) — ทำลาย Block, ดาเมจ v3, Vulnerable 2
- Barrage (E · 3/6/4 · area r1 ระยะ 6) — ดาเมจ v1 ×2
- **One Shot** (L · 3/10/5 · ระยะ 9, charge) — ดาเมจ v6, crit +50%, สองเท่าเมื่อเป้า < 40%

### Ranger (`rg_`, wind/poison, ATK)
- ★ Call Hawk (C · 2/0/3 · hex ระยะ 2) — เรียกเหยี่ยว
- ★ Barbed Arrow (C · 1/0/0 · ระยะ 5) — ดาเมจ v1, Bleed 2
- ★ Bear Trap (C · 1/0/1 · ระยะ 3) — ดาเมจ v1, Root 2
- Thornshot (C · 1/0/1 · ระยะ 4) — ดาเมจ v0 poison, Poison 2, Bleed 1
- Fleet Step (C · 1/0/1 · hex ระยะ 3) — เดิน 3, Haste 1
- Hawk Dive (R · 2/0/2 · ระยะ 6) — ดาเมจ v2 wind, Mark
- Net Trap (R · 2/0/3 · area r1 ระยะ 4) — Root 2
- Pack Tactics (R · 1/0/3 · รอบตัว 2 เพื่อน) — Haste 2, Strength 1
- Poison Spikes (R · 2/0/2 · area r1 ระยะ 4) — ดาเมจ v0 poison, Poison 3
- Wild Hunt (E · 2/6/3 · ระยะ 6) — ดาเมจ v2 wind ×3
- Snare Field (E · 3/6/4 · area r2 ระยะ 4) — ดาเมจ v1, Root 1, Poison 2
- **The Great Hunt** (L · 3/12/5 · รอบตัว 4) — ดาเมจ v3 wind, Root 1, Mark

### Reaper (`rp_`, shadow, ATK)
- ★ Scythe Sweep (C · 1/0/1 · cone 2) — ดาเมจ v1 shadow
- ★ Harvest (C · 1/0/1) — ดาเมจ v1, สองเท่าเมื่อเป้า < 30%
- ★ Grave Step (C · 1/0/2 · ระยะ 4, movement) — dash, ดาเมจ v1, onKill จั่ว 1
- Soul Tithe (C · 1/0/1) — ดาเมจ v1 shadow, ดูด 50%
- Omen (C · 0/0/2 · ระยะ 3) — Vulnerable 2, Mark
- Reap (R · 1/0/2) — ดาเมจ v2, onKill +1 Action Slot
- Wailing Scythe (R · 2/0/2 · รอบตัว 1) — ดาเมจ v1 shadow, Weak 2
- Soul Shroud (R · 1/0/3 · ตัวเอง) — Stealth, Block 2
- Gravecall (R · 1/0/2 · ระยะ 3) — ดึง 2, ดาเมจ v1 shadow
- Final Rites (E · 2/6/3) — ดาเมจ v3 shadow, สองเท่าเมื่อเป้า < 40%, onKill +1 Action Slot
- Danse Macabre (E · 3/8/4 · รอบตัว 2) — ดาเมจ v2, ดูด 30%, Bleed 2
- **The Reaping** (L · 3/12/5 · รอบตัว 3) — ดาเมจ v3 shadow, สองเท่าเมื่อเป้า < 30%, Bleed 3

### Venomancer (`vm_`, poison)
- ★ Toxin Dart (C · 1/0/0 · ระยะ 4) — ดาเมจ v0 poison, Poison 3
- ★ Noxious Cloud (C · 1/0/1 · area r1 ระยะ 4) — Poison 2
- ★ Virulence (C · 0/0/2 · ระยะ 4) — Poison 1, แพร่ Poison
- Mithridate (C · 1/0/2 · ตัวเอง) — Cleanse, Block 2
- Corrode (C · 1/0/1 · ระยะ 3) — ดาเมจ v1 poison, Vulnerable 1
- Fester Bloom (R · 2/0/2 · area r1 ระยะ 4) — ดาเมจ v0, +1 ต่อ Poison บนเป้า
- Blight (R · 1/0/2 · ระยะ 4) — Poison 4, Weak 1
- Toxic Blood (R · 1/0/3 · ตัวเอง) — Thorns 3, Regen 2
- Paralytic (R · 2/0/3 · ระยะ 4) — ดาเมจ v1 poison, Stun 1
- Pandemic (E · 2/6/3 · ระยะ 5) — Poison 3, แพร่ Poison และ Bleed
- Necrotic Burst (E · 3/8/4 · area r1 ระยะ 4) — ดาเมจ v2 poison, +1 ต่อ Poison (ลบออก)
- **Plague** (L · 3/12/5 · รอบตัว 4) — ดาเมจ v2 poison, Poison 5, Weak 2

### Bishop (`bi_`, holy, MATK)
- ★ Greater Heal (C · 1/0/1 · เพื่อน ระยะ 3) — ฮีล v3
- ★ Holy Word (C · 1/0/0 · ระยะ 4) — ดาเมจ v1 holy, Weak 1
- ★ Sacred Ward (C · 1/0/1 · เพื่อน ระยะ 3) — Block 2, Regen 2
- Benediction (C · 1/0/2 · เพื่อน ระยะ 3) — Strength 2, Haste 1
- Absolution (C · 0/0/1 · เพื่อน ระยะ 3) — Cleanse, Block 1
- Prayer of Mending (R · 2/5/3 · รอบตัว 2 เพื่อน) — ฮีล v2, Regen 1
- Censure (R · 2/0/2 · ระยะ 4) — ดาเมจ v2 holy, Vulnerable 2
- Sanctify (R · 1/0/3 · รอบตัว 2 เพื่อน) — Block 2
- Holy Fire (R · 2/4/2 · area r1 ระยะ 4) — ดาเมจ v1 holy, Burn 1
- Mass Resurrection (E · 3/12/5 · ตัวเอง) — ชุบชีวิต 60%
- Divine Intervention (E · 2/6/4 · เพื่อน ระยะ 4) — Block 5, Fortify, Cleanse
- **Miracle** (L · 3/12/5 · รอบตัว 3 เพื่อน) — ฮีล v4, ชุบชีวิต 50%, Regen 3

### Monk (`mo_`, holy, ATK)
- ★ Palm Strike (C · 1/0/0) — ดาเมจ v1 holy, ผลัก 1
- ★ Flurry (C · 1/0/1) — ดาเมจ v0 ×3
- ★ Centering (C · 0/0/2 · ตัวเอง) — Block 2, จั่ว 1
- Rising Kick (C · 1/0/1) — ดาเมจ v1, Combo (หลังการ์ดโจมตี): +2
- Flowing Step (C · 0/0/2 · hex ระยะ 2) — เดิน 2, Haste 1
- Chi Burst (R · 2/0/2 · รอบตัว 1) — ดาเมจ v1 holy, perPlayed +1
- Iron Body (R · 1/0/2 · ตัวเอง) — Block 3, Thorns 2
- Pressure Point (R · 1/0/2) — ดาเมจ v1, Weak 2, Vulnerable 1
- Inner Fire (R · 0/0/3 · ตัวเอง) — +1 Action Slot, Strength 1
- Seven-Star Strike (E · 2/0/3) — ดาเมจ v0 ×5, perPlayed +1
- Dragon's Ascent (E · 3/6/4) — ดาเมจ v3 holy, ผลัก 3, Stun 1
- **Hundred Fists** (L · 3/10/5) — ดาเมจ v1 ×6, perPlayed +1, ผลัก 2

### Engineer (`en_`, earth/fire, ATK)
- ★ Deploy Cannon (C · 2/0/3 · hex ระยะ 2) — สร้างปืนใหญ่
- ★ Rivet Gun (C · 1/0/0 · ระยะ 4) — ดาเมจ v0 ×2
- ★ Patch Up (C · 1/0/1 · เพื่อน ระยะ 3) — ฮีล v2, Block 1 (ใช้กับสิ่งก่อสร้างได้)
- Smoke Charge (C · 1/0/2 · area r1 ระยะ 3) — Weak 2
- Calibrate (C · 0/0/2 · ตัวเอง) — จั่ว 1, cooldown −1
- Shield Pylon (R · 2/0/4 · hex ระยะ 2) — สร้างเสาโล่
- Grenade (R · 2/0/2 · area r1 ระยะ 4) — ดาเมจ v1 fire, Burn 1
- Tesla Coil (R · 2/4/3 · เส้น 4) — ดาเมจ v1 wind, Vulnerable 1, Stun 1
- Bulwark Plate (R · 2/0/3 · เพื่อน ระยะ 3) — Block 4
- Rocket Barrage (E · 3/8/4 · area r2 ระยะ 6) — ดาเมจ v2 fire, ผลัก 1
- Mech Suit (E · 2/8/5 · ตัวเอง) — ขี่หุ่นรบ 3 เทิร์น: เดิน +2, ดาเมจ +2 ทุกการโจมตี, Block 3 (ไอเดียผู้เล่น)
- **Artillery Barrage** (L · 3/12/5 · area r2 ระยะ 7) — ดาเมจ v4 fire, Stun 1

### Forgemaster (`fm_`, fire/earth, ATK)
- ★ Molten Hammer (C · 1/0/0) — ดาเมจ v2 fire, Burn 1
- ★ Anvil Guard (C · 1/0/1 · ตัวเอง) — Block 3
- ★ Heat the Steel (C · 0/0/2 · ตัวเอง) — Strength 2, จั่ว 1
- Crushing Blow (C · 1/0/1) — ทำลาย Block, ดาเมจ v1 earth
- Slag Throw (C · 1/0/1 · ระยะ 3) — ดาเมจ v1 fire, Burn 2
- Seismic Hammer (R · 2/0/2 · เส้น 4) — ดาเมจ v2 earth, ผลัก 1
- Quench (R · 1/0/3 · ตัวเอง) — Cleanse, Block 3, Fortify
- Tempered Edge (R · 2/0/3 · รอบตัว 2 เพื่อน) — Strength 2
- Bellows Blast (R · 2/4/2 · cone 3) — ดาเมจ v1 fire, Burn 2, ผลัก 1
- Shatter Armor (E · 2/0/3) — ทำลาย Block, ดาเมจ v3 earth, Vulnerable 3
- Magma Pool (E · 3/8/4 · area r1 ระยะ 4) — ดาเมจ v2 fire, Burn 3, Root 1
- **Worldforge Slam** (L · 3/12/5 · เส้น 6) — ดาเมจ v4 earth, Burn 3, Stun 1

### ที่ดรอป
- ด่าน 1–6: ไม่ดรอป
- ด่าน 7–11: ต่อสู้ธรรมดา/หีบ/ร้าน → Common, Rare · มินิบอส/MVP → Epic · MVP ด่าน 9–11 → Legendary โอกาส 5%
- ด่าน 12–17: ทุกระดับ · MVP → Legendary โอกาส 20%
- ดรอปเฉพาะการ์ดของอาชีพที่ฮีโร่ในปาร์ตี้เปลี่ยนไปแล้ว
- เด็คสูงสุด 18 → **22**

## 7. VFX

- การ์ดอาชีพขั้นสองทุกใบมี sheet ของตัวเองใน `public/vfx` (`fx(...)` ใหม่ใน `tools/vfx/effects.mjs`) · โทนสีตามอาชีพ (ข้อ 2)
- Common–Epic: เฉพาะบนช่อง ไม่แตะทั้งจอ · ยาวไม่เกิน ~1 วินาที
- Legendary: ท่าไม้ตายเต็มจอ ไม่เกิน ~2 วินาที · ต้องมี **ชั้นคลุมจอ** ใหม่ (สี/ความมืด/หมอก/เส้น) วาดด้วย canvas 2D ทับฉาก โดยเตรียมภาพไว้ครั้งเดียว (ห้ามคำนวณหนักทุกเฟรม)

| Legendary | จอ | กล้อง | จังหวะ |
|---|---|---|---|
| Thousand-Lance Charge | เส้นความเร็วแนวนอน | แพนตามแนวพุ่ง | พุ่งเร็ว ระเบิดทีเดียวที่ปลาย |
| Judgment of Heaven | สว่างขาวทอง | เงยขึ้นฟ้า | ช้า ขลัง เสียงระฆัง |
| Cataclysm | แบ่งครึ่งแดง/ฟ้า | ถอยให้เห็นทั้งสนาม | ไฟ/น้ำแข็งตกสลับ แล้วระเบิดไอน้ำ |
| Eclipse | หมดสี เหลือแต่ม่วง + ดวงอาทิตย์ดำ | นิ่ง | เงียบ แล้วชีวิตไหลกลับหาผู้ใช้ |
| One Shot | เวลาหยุด สีเทา | ซูมเข้าเป้า + เป้าเล็ง | เงียบ นัดเดียว แล้วตูม |
| The Great Hunt | เงาเหยี่ยวยักษ์บินผ่าน | นิ่ง | กับดักทำงานเป็นระลอก |
| The Reaping | ดับมืดชั่วพริบตา + รอยเคียวขาวทีละเส้น | นิ่ง | ไฟกลับมา ศัตรูโดนพร้อมกัน |
| Plague | หมอกเขียวคืบจากขอบจอ | ค่อย ๆ ถอย | ช้า แล้วพิษทำงาน |
| Miracle | แสงอุ่น ขนนกโปรย | ลอยขึ้น | นุ่ม ไม่มีจอสั่น |
| Hundred Fists | สีปกติ | กระตุกเข้าเป้าทุกหมัด | รัว แล้วคลื่นกระแทก |
| Artillery Barrage | ไฟเตือนแดงกะพริบ + เป้าบนช่อง | มองจากบน | หน่วง แล้วกระสุนตกเป็นจังหวะ จอสั่น |
| Worldforge Slam | ร้อนส้ม อากาศบิด | เอียงตามรอยแตก | ทุบ แผ่นดินแตก ลาวาพุ่งตามรอย |

## 8. องก์ 3 — หน้าที่ถูกลบ (ด่าน 12–17)

แผนที่โลก **หน้า 2**: กระดาษของผู้สร้าง ขาว หมึกทอง เริ่มเกือบว่าง แต่ละแดนถูกวาดขึ้นเมื่อไปถึง · มุมกระดาษพับที่มุมจอสำหรับพลิกไปมา · เปิดหลังจบด่าน 11

เรื่อง: ก่อนโลกของเรา Aeon สร้างโลกไว้หลายใบแล้วลบทิ้ง เศษของมันยังลอยอยู่ขอบกระดาษ ปาร์ตี้ถือปากกาจึงมองเห็นและเดินเข้าไปได้ · แก่นต่อจากองก์ 2: ของที่ถูกทิ้งควรทำอะไรต่อ

| ด่าน | ชื่อ | แดน | มอนสเตอร์ (5) | มินิบอส | MVP |
|---|---|---|---|---|---|
| 12 | Inkmire · The World Left Unpainted | โลกร่างไม่ลงสี เส้นหมึกบนกระดาษ | ink_sketch (ร่างหมาป่า), blot_crawler, quill_wisp, smudge_golem, draft_knight | Unfinished Colossus (ครึ่งตัวยังเป็นเส้นร่าง) | **The First Sketch** สัตว์ร่างแรกที่อยากถูกวาดให้เสร็จ |
| 13 | Crystal Deep · Where Light Was Kept | ถ้ำผลึกยักษ์ แสงหักเห | prism_bat, shard_crab, glow_eel, geode_brute, lumen_monk | Refractor (สะท้อนการ์ดเวทกลับ) | **The Crystal Queen** ขังแสงสุดท้ายของโลกไว้ |
| 14 | Titanfall · The Graveyard of Giants | เดินบนกระดูกยักษ์ | bone_vulture, marrow_worm, giant_tick, rib_sentinel, dust_shaman | Gravekeeper of Giants | **The Last Titan** ยักษ์ที่ยังไม่ยอมล้ม (ใหญ่ 3 ช่อง) |
| 15 | Stormcrown · The Sky That Never Rests | ที่ราบสูง พายุไม่หยุด · สายฟ้าฟาดช่องสุ่มทุกเทิร์น (มีเตือนล่วงหน้า) | storm_imp, thunder_ram, gale_harpy, cloud_eater, static_wisp | Tempest Herald | **The Thunderbird** นกอัสนีที่เกิดจากพายุ |
| 16 | The First Page · The World Drawn by a Child | โลกใบแรกของ Aeon ดูหยาบ สีเทียน | crayon_beast, paper_soldier, scribble, toy_dragon, margin_doodle | The Kept Toy | **The Eraser** สิ่งที่ Aeon ทิ้งไว้แล้วยังลบต่อเอง ลบช่องบนสนามทีละแถว |
| 17 | The Inkwell · Where Every World Was Drawn From | ขวดหมึกต้นกำเนิด หมึกกำลังแห้ง | ink_leech, hollow_shade, dry_quill, void_moth, blot_spawn | Blot Herald | **The Blot** 3 เฟส (ข้อ 8.1) |

- ใช้ร่างมอนสเตอร์ที่มี (`humanoid golem beast floating …`) เปลี่ยนสีให้มากที่สุด · ร่างใหม่ที่ต้องวาด: `sketch` (เส้นหมึก), `crystal`, `titan`, `bird` ใหญ่, `eraser`, `blot`
- แต่ละด่าน: แผนที่สำรวจ 1 แผ่น · บอร์ดต่อสู้ skirmish 3 แผ่น + boss 1 แผ่น · วัตถุดิบ 2 ชนิด · การ์ดรางวัลบอส (r_, cls any) 1 ใบ · ไอเทมยูนิค 1 ชิ้น · กฎบอสใน `bossRules.js` · ฉากเปิดตัวบอส (ไม่ซ้ำ)
- อุปกรณ์: เพิ่ม tier 7–12 (ชื่อ tier ใหม่) และสูตร forge tier 7–12 ใช้วัตถุดิบด่าน 7–17 (แก้ที่ forge ค้างที่ tier 6)
- สูตร XP ด่าน 12–17: ตั้งเอง ไม่ใช้ `eff()` ต่อ (ข้อ 3)

### 8.1 ด่าน 17 ตอนจบใหญ่
- **The Blot** รอยดำที่กลืนทุกสิ่งที่ถูกวาด — ความกลัวที่ทำให้ Aeon เลิกสร้าง
- เฟส 1: ร่างรอยหมึก ขยายรอยดำบนสนาม (ช่องดำ = เสีย HP เมื่อยืน)
- เฟส 2 (HP 66%): แยกเป็นเงาของบอสเก่า 3 ตัว (Guardian, Lich, Pyrelord สีดำ)
- เฟส 3 (HP 33%): **แดนที่ออร์รินเคยลงหมึกทับในองก์ 1 กลับมาเป็นหมึกช่วยปาร์ตี้** ทุกเทิร์นได้ Block/ฮีลจากหมึกเหล่านั้น — จุดพีคทางอารมณ์
- ฉากจบ + เครดิต + ฉากหลังเครดิตที่ปูทางต่อ (ข้อ 9)

## 9. เนื้อเรื่ององก์ 3 (ฉาก)

ตามแบบ `docs/story.md`: บทพูดอยู่ใน `src/story/lines.js` (อังกฤษ/ไทย) ฉากใน `src/story/scenes.js` ใช้ระบบเวทีเดิม

| รหัส | ชื่อฉาก | เกิดอะไรขึ้น | ประโยคสำคัญ |
|---|---|---|---|
| J | ชื่อใหม่ | (เปลี่ยนอาชีพ) หน้ากระดาษลอยมา ลายมือออร์รินเขียนชื่อใหม่ แสงสีอาชีพ ชุดเปลี่ยน | "ข้าวาดเจ้าไว้แค่ร่างแรก ที่เหลือเจ้าวาดเอง" |
| 12N | หน้าถัดไป | (เปิดหน้า 2) ปากกาลากเส้นบนกระดาษขาว แดนแรกปรากฏ เป็นแค่เส้นร่าง | "ก่อนโลกของเจ้า มีโลกอื่นที่เขาไม่ได้วาดให้จบ" |
| 12B | ร่างแรก | บอสไม่ได้โกรธ มันขอให้ปาร์ตี้วาดมันให้เสร็จ | "วาดข้าให้จบที ข้ารอมานานแล้ว" |
| 13B | ราชินีผลึก | เก็บแสงไว้ไม่ให้โลกดับ แต่โลกมืดเพราะนาง | "ถ้าข้าปล่อย มันจะหมดไป" |
| 14B | ยักษ์ตนสุดท้าย | ยืนเพราะไม่มีใครบอกให้ล้มได้ | "ไม่มีใครสั่งให้ข้าล้ม" |
| 15B | นกอัสนี | เกิดจากพายุที่ Aeon ลืมหยุด | "ข้าคือเสียงตะโกนที่ไม่มีใครฟังจนจบ" |
| 16A | หน้าแรก | โลกใบแรก สีเทียน ลายมือเด็ก ชื่อ "Aeon" เขียนผิด ๆ ถูก ๆ บนมุมกระดาษ | (ไม่มีบทพูด) |
| 16B | ยางลบ | ยางลบลบเองโดยไม่มีมือจับ เหมือนเครื่องจักรด่าน 8 | "ลบ…ลบ…ลบ" |
| 17A | ขวดหมึก | หมึกแห้ง มีบางสิ่งดื่ม | "ไม่ใช่ใครลบโลก มีบางอย่างกินมันอยู่" |
| 17B | รอยดำ | The Blot ปรากฏ กลืนเส้นรอบตัว | "ทุกเส้นที่วาด สุดท้ายก็เป็นของข้า" |
| 17C | หมึกที่กลับมา | (เฟส 3) แดนที่ออร์รินกลืนกลับมาเป็นหมึก ตามด้วยรอยมือพันผ้า | "เขาไม่ได้กลืนพวกเรา เขาเก็บเราไว้" |
| 17D | หมึกเต็มขวด | Blot แตก ขวดหมึกเต็มอีกครั้ง ปาร์ตี้จุ่มปากกา | "คราวนี้ ไม่มีใครต้องลบ" |
| 17E | หน้า 3 (หลังเครดิต) | ปากกาขยับเขียนเองหนึ่งคำบนหน้า 3 ที่ว่าง อีกมือหนึ่งกำลังวาดเข้ามา | "…ใครวาด Aeon" |

บทพูดเต็มทุกบรรทัดเขียนตอนทำขั้น 5 (ข้อ 12) และใส่ต่อท้าย `docs/story.md` เป็นองก์ 3

## 10. สิ่งที่ต้องไม่ตกหล่น (checklist ข้ามระบบ)
- แปลไทยทุกข้อความใหม่ใน `src/i18n/th.js` (ชื่อการ์ด/ชื่ออาชีพเป็นอังกฤษตามกฎ)
- ภาพการ์ด: ไอคอนใหม่ใน `cardArt.js` เมื่อจำเป็น (lance, scythe, hawk, cannon, pylon, fist, mitre, flask, curse, crystal…)
- เซฟเก่า: ฮีโร่เดิมได้ `job: null` อัตโนมัติ · เลื่อน `SAVE_VERSION` · เลเวล 30 ที่มี XP ค้าง ได้ของเปลี่ยนอาชีพตอนโหลด
- co-op: ส่ง `job` ไปกับข้อมูลฮีโร่ · ไม่เพิ่ม read/write Firebase
- AI มอนสเตอร์ต้องรู้จักสิ่งก่อสร้างใหม่ (hawk, cannon, pylon) และสถานะ curse
- ภารกิจ (quests) ใหม่: เปลี่ยนอาชีพ, จบด่าน 12–17
- หน้า Story ในเกม (ดูฉากซ้ำ) แสดงฉากองก์ 3
- เพลง: ใช้เพลงที่มีหรือเพิ่มในเครื่องเสียงที่สร้างด้วยโค้ด
- ลิ้งก์ในหน้าแรก/เครดิต

## 11. การทดสอบ (ทุกขั้นต้องผ่านก่อนไปขั้นต่อไป)
ทดสอบใน Chrome ของผู้ใช้ผ่าน Claude in Chrome (ไม่ใช้ headless) · ใช้ตัวละครทดสอบแล้วลบทิ้ง · ไม่แตะ Guest2
1. `npm run lint` 0 error · `vite build` ผ่าน
2. สคริปต์ทดสอบการ์ด: เล่นการ์ดใหม่ทุกใบในการต่อสู้จริง (inject เข้ามือ) ทุก rarity ทุกเลเวลอัปเกรด → ไม่มี error, เลขดาเมจ/สถานะตรงกับคำอธิบาย
3. เปลี่ยนอาชีพครบ 12 อาชีพ: แจ้งเตือน → กระเป๋า → เมนู → ยืนยัน → ฉาก J → ได้การ์ด 3 ใบ → tree ใหม่ → ชุดใหม่ทั้งชาย/หญิง
4. เซฟเก่า (ตัวละครเลเวล 30 ที่มี XP ค้าง) โหลดแล้วได้ของเปลี่ยนอาชีพ ไม่พัง
5. co-op สองแท็บ: เพื่อนเห็นชุดใหม่ การ์ดใหม่เล่นได้ ฉากข้ามได้
6. ด่าน 12–17: เดินครบทุกด่าน สู้มินิบอส/MVP กฎบอสทำงาน ฉากเล่นครบ แผนที่หน้า 2 พลิกได้
7. VFX: ดูทุกเอฟเฟกต์ที่ความเร็วจริง ส่ง GIF ท่าไม้ตายให้ดู
8. มือถือแนวนอน: เมนูเลือกอาชีพ หน้าสร้างตัวละคร แผนที่หน้า 2

## 12. ลำดับการทำ
1. **รากฐาน** — เลเวล 50, `hero.job`, ข้อมูลอาชีพ (`JOBS` ใน classes.js), helper `canUseCard(hero, card)` แทนการเช็ก `cls` ทุกที่, แก้บั๊ก +3 stat, การแจ้งเตือน + ของในกระเป๋า + เมนูเลือกอาชีพ, หน้าสร้างตัวละครดูอาชีพขั้นสอง, ชุดใหม่ 12 อาชีพใน chibi.js, skill tree ใหม่ + `cardMod`/`startStatus`
2. **การ์ด** — กลไกใหม่ (ข้อ 6), 144 ใบ, การดรอป, เด็ค 22, คำแปล, ไอคอนภาพการ์ด
3. **VFX การ์ด** — 132 เอฟเฟกต์ (Common–Epic)
4. **VFX ท่าไม้ตาย** — ชั้นคลุมจอ + 12 ท่า
5. **องก์ 3** — แผนที่หน้า 2, ด่าน 12–17 (แผนที่ บอร์ด มอนสเตอร์ บอส กฎบอส), อุปกรณ์ tier 7–12, สูตร XP, ฉาก J/12N–17E, บทพูด
6. **สมดุลและเล่นจริง** — ปรับตัวเลขจากการเล่นจริง ทั้งคนเดียวและ co-op

## 13. ความคืบหน้า
- [x] ขั้น 1 รากฐาน — โค้ดเสร็จ (เลเวล 50, ไอเทมหน้ากระดาษ, เมนูเลือกอาชีพ, ดูอาชีพตอนสร้างตัว, รูปร่าง 12 อาชีพ, tree + cardMod/startStatus, ภาษาไทย, CSS, เด็ค 22) · เทสด้วย node และใน Chrome แล้ว (ทุกหน้าจอ, มือถือแนวนอน)
- [x] ขั้น 2 การ์ด — การ์ด 144 ใบ + Trample/Curse/onKill/perPlayed/Hawk/Cannon/Pylon/Mech/immunePoison เสร็จ · จำลองต่อสู้ 48 ศึก ไม่มี error ไม่ค้าง · เทสใน Chrome แล้ว · การ์ดอาชีพทุกใบมีรูปวาดของตัวเอง (SCENE ใน cardArt.js)
- [ ] ขั้น 3 VFX การ์ด
- [ ] ขั้น 4 VFX ท่าไม้ตาย
- [ ] ขั้น 5 องก์ 3
- [~] ขั้น 6 สมดุล — รอบแรก (จำลอง 3 ฮีโร่อาชีพเดียวกัน vs ด่าน 11, เลเวล 45, อุปกรณ์ tier 11 rare, บอตเดินเข้าหาแล้วสุ่มการ์ด):
  - Monk: ไม่คืนแต้ม แต่สายเดิมต้องเป็นฐานได้ → การ์ดลมปราณ (Palm, Chi Burst, Dragon's Ascent, Hundred Fists) ใช้ MATK · หมัดเท้า (Flurry, Rising Kick, Seven-Star, Pressure Point) ใช้ ATK · Hardened Knuckles +1 ATK · ลง INT ต่อชนะ 33% ลง STR หลังเลเวล 30 ชนะ 42% · ใส่เกราะเบาได้ (`armorTypes` ใน JOBS, ดรอปด้วย) · Centering Block 3, Iron Body Block 4 → ชนะ 4% → 42%
  - Ranger: Barbed Arrow 2, Thornshot 1, Poison Spikes 1, เหยี่ยวตี ATK ×1.0
  - Engineer: Rivet Gun 1×2, Grenade 2
  - Reaper: Final Rites execute 30%, The Reaping 2, Soul Tithe drain 30%, Omen Vulnerable 1
  - Marksman: Steady Shot 1
  - MP ตั้งใจให้เหลือเฟือ (ผู้เล่นตัดสินใจ): เกมเน้นบริหารช่องแอ็กชัน ไม่ต้องคิดเรื่อง MP · ปรับพลังด้วยช่อง/คูลดาวน์/ลูกเต๋า/ดาเมจแทน
  - ยังเหลือ: XP ด่าน 12–17 และสมดุลกับมอนสเตอร์องก์ 3
