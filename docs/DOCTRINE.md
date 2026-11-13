# Doctrine alignment

What the simulation models, the US Army practice it follows, and where it knowingly simplifies. Sources are public; where a point rests on general knowledge and has not been checked against a publication, it says so.

## What follows published practice

| In the simulation | Practice it follows | Source |
| --- | --- | --- |
| A rifle squad is nine soldiers: a squad leader and two four-soldier fire teams, each with a team leader, automatic rifleman, grenadier and rifleman | Standard rifle squad organisation | [ROTC text, "Introduction to Tactics I"](https://www.uakron.edu/armyrotc/MS1/10.pdf); [Army correspondence course IN0201](https://www.globalsecurity.org/military/library/policy/army/accp/in0201/ch1.htm) |
| Riflemen fire at about 13 rounds a minute in a sustained fight | M4 sustained rate of 12 to 15 rounds a minute | [ROTC text, table of M16/M4 characteristics](https://www.uakron.edu/armyrotc/MS1/10.pdf) |
| On contact a unit returns fire, takes cover and reports, and only then does its leader assess and decide whether to hold or break contact | Battle drill "react to contact": return fire, seek cover, report; the leader then assesses and chooses a course of action such as break contact | [FM 7-7 battle drill examples](https://www.globalsecurity.org/military/library/policy/army/fm/7-7/Apph.htm); [FM 3-21.71 Appendix E](https://www.globalsecurity.org/military/library/policy/army/fm/3-21-71/appe.htm) |
| The first report is a contact report, followed by size, activity, location, time and equipment | Contact report followed by a SALUTE report | [Common battle drills for infantry units](https://www.elon.edu/assets/docs/rotc/COMMON_BATTLE_DRILLS_FOR_ALL_INFANTRY_UNITS.pdf) |
| Sightings are sent as SPOT reports in SALUTE format | The spot report uses the SALUTE format | [FM 34-35 Appendix C](https://irp.fas.org/doddir/army/fm34-35/Appc.htm) |
| After contact the unit sends a LACE report: liquid, ammunition, casualties, equipment | LACE report | [ROTC reference card](https://www.clemson.edu/business/academics/army-rotc/documents/rotc-reference.docx) |
| Wounded trigger a MEDEVAC request beginning with location, number by precedence and security at the site | 9-line MEDEVAC request | [9-line card](https://academics.nsuok.edu/Portals/27/pdfs/9-Line%20UXO%20Card.pdf) |
| Units have two independent ways to talk to the base: FM voice, which needs range and line of sight, and vehicle-mounted satellite messaging, which is slow but ignores terrain | A PACE plan should rest on different systems, for example JBC-P, TACSAT and FM | [JMRC observations on PACE plans](https://medium.com/experientia-et-progressus/common-trends-in-brigade-medical-operations-from-jmrc-439812e177be) |
| The logistics officer compiles a LOGSTAT and the resupply is built from it and sent forward as a LOGPAC | The LOGSTAT tells the supporting unit what is needed; LOGPACs are assembled from those reports and moved forward | [The 1SG's Role in Sustaining the Fight](https://www.army.mil/article/278237/); [CALL 99-6, LOGPAC resupply operations](https://www.globalsecurity.org/military/library/report/call/call_99-6_logpac.htm) |
| Supplies are tracked by class: I rations and water, III fuel, IV barrier material, V ammunition, IX repair parts | Classes of supply | [FM 71-2, battalion S4 responsibilities](https://www.globalsecurity.org/military/library/policy/army/fm/71-2/ch72.htm) |
| Base security is continuous and comes first; communications with higher are continuous | Priorities of work: security (continuous), then communication (continuous), then the rest | [Ranger Handbook extract on patrol bases](https://boisestate.edu/sps-militaryscience/wp-content/uploads/sites/123/2014/04/baseoperations.pdf) |

The governing references for the next round of checking are ATP 3-21.8, *Infantry Rifle Platoon and Squad* (January 2024), and ATP 3-37.10, *Base Camps*.

## Known departures and simplifications

- **Staff titles.** S3 and S4 are battalion staff officers. A company-sized base would be run by a commander, executive officer, first sergeant and supply sergeant. The titles were kept because the brief asked for an operations officer and a logistics officer; the cleanest fix is to make the base a small battalion task force command post, or to rename the roles.
- **Platoon structure.** There is no weapons squad, and the platoon leader and platoon sergeant exist only as people at the command post.
- **Vehicle crews.** Each squad rides in two vehicles with a driver and gunner each; the other five dismount. Real load plans vary by vehicle.
- **Machine-gun rates.** The M249 fires at about 50 rounds a minute, which matches the commonly quoted sustained rate. The M240 rate of about 100 a minute is from general knowledge and is unchecked.
- **Position beacons.** Vehicles report position every five minutes and can pass text over satellite in two to five minutes. Real update rates and latency vary; these numbers are placeholders.
- **Maintenance.** The service interval is compressed to about 110 km so that maintenance competes with operations inside a few days. Real scheduled services are far less frequent; daily checks are not modelled.
- **Fuel quality.** Tanks are sampled once a day by rule. Real fuel surveillance has several tests on different schedules.
- **Rations.** Only MREs, with a three-year shelf life. The expiry mechanism works and is tested, but nothing perishable is in the scenario.
- **Medical evacuation.** There is no air MEDEVAC; units carry their wounded back to the aid station. Time-to-surgery does not yet affect survival.
- **Route clearance and bomb disposal** are not modelled. Convoys are escorted but nobody clears the route.
- **Engineers.** The base is already built. The arrive, build and depart cycle for engineers described in the design document is not in this slice.
- **Fires and aviation.** No mortars, artillery, attack aviation or unmanned aircraft.
- **The enemy** is a generic irregular force with rifles, a machine gun and a rocket launcher per cell. Its behaviour follows no specific doctrine.
- **Combat resolution** is statistical per round fired. Hit probabilities were tuned so that a few minutes of fighting between a squad and a cell produces a handful of casualties, not calibrated against data.
