export interface DisasterInstruction {
  id: string;
  category: 'STRUCTURAL_COLLAPSE' | 'STAMPEDE' | 'FIRE' | 'FLOOD' | 'TRIAGE';
  title: string;
  icon: string;
  urgency: 'IMMEDIATE' | 'HIGH' | 'CRITICAL';
  steps: string[];
  doNotList: string[];
  signallingTips: string;
  meshTips: string;
}

export class InstructionService {
  private static INSTRUCTIONS: DisasterInstruction[] = [
    {
      id: 'inst_collapse',
      category: 'STRUCTURAL_COLLAPSE',
      title: 'Structural Collapse / Entrapment Survival',
      icon: '🏢',
      urgency: 'CRITICAL',
      steps: [
        'DROP, COVER, AND HOLD ON: Protect head and torso beneath load-bearing furniture or interior wall frame.',
        'IDENTIFY VOID SPACES: Seek triangular void spaces beside sturdy objects rather than beneath fragile tables.',
        'PROTECT YOUR AIRWAY: Cover nose and mouth with cloth or clothing to avoid breathing toxic concrete and drywall dust.',
        'CONSERVE AIR & ENERGY: Limit unnecessary screaming. Tap rhythmically with a metal object or rock against pipes/walls (3 rhythmic taps).',
        'ACTIVATE RESCUENET MESH: Leave your smartphone power on with Bluetooth/Wi-Fi active. The mesh hop engine propagates your SOS through rubble.',
      ],
      doNotList: [
        'DO NOT ignite matches, candles, or lighters (gas leaks may cause violent explosions).',
        'DO NOT use elevators under any circumstances.',
        'DO NOT kick up dust through erratic, uncontrolled panic movements.',
      ],
      signallingTips: 'Sound travels farther through structural steel and pipes than air. Tap 3 distinct times, pause 5 seconds, repeat.',
      meshTips: 'Keep phone within 1 meter of your body; mesh packets will hop outward to emergency responders outside the perimeter.',
    },
    {
      id: 'inst_stampede',
      category: 'STAMPEDE',
      title: 'Stampede / Crowd Surge & Crush Survival',
      icon: '🏃',
      urgency: 'CRITICAL',
      steps: [
        'ASSUME THE BOXER STANCE: Place feet shoulder-width apart, knees slightly bent, and hold hands/forearms in front of your chest to protect ribs and preserve breathing volume.',
        'MOVE WITH THE SURGE: Never fight directly against a moving crowd. Steer diagonally toward the periphery of the mass.',
        'AVOID CORNERS & WALLS: Stay away from barricades, dead ends, and solid pillars where compressive asphyxiation occurs.',
        'IF YOU FALL, CURL INTO A FETAL BALL: Protect your head with locked hands, curl onto your LEFT side to protect vital organs and liver, and get up immediately as pressure eases.',
      ],
      doNotList: [
        'DO NOT bend down to pick up dropped phones, bags, or belongings in a moving crowd.',
        'DO NOT scream continuously; conserve oxygen against compressive forces.',
        'DO NOT push directly against oncoming crowd waves.',
      ],
      signallingTips: 'If separated from your party, maintain line of sight with high landmarks and avoid screaming.',
      meshTips: 'Mesh beacons from multiple devices in the crowd automatically trigger collective consensus on candidate stampede patterns.',
    },
    {
      id: 'inst_fire',
      category: 'FIRE',
      title: 'Structure Fire & Thermal Blaze Hazard',
      icon: '🔥',
      urgency: 'CRITICAL',
      steps: [
        'STAY LOW BENEATH SMOKE: Clean, breathable air resides in the lowest 30-60 cm from the floor. Crawl on hands and knees.',
        'TEST DOORS BEFORE OPENING: Feel door handles and frames with the BACK of your hand. If hot, DO NOT open.',
        'FILTER AIR: Place a wet cotton cloth or bandana over mouth and nostrils.',
        'SEAL GAPS IF TRAPPED: Close room doors and stuff wet clothing or towels beneath door cracks to prevent smoke entry.',
        'STOP, DROP, AND ROLL: If clothing catches fire, immediately stop, drop to the ground, cover face with hands, and roll back and forth.',
      ],
      doNotList: [
        'DO NOT open windows if fire is outside, as fresh oxygen accelerates backdrafts.',
        'DO NOT return into a burning structure for personal possessions.',
        'DO NOT use elevators.',
      ],
      signallingTips: 'Hang a bright cloth from a window to signal exterior firefighters without opening the window fully.',
      meshTips: 'Transmit a FIRE disaster report immediately before battery exposure to extreme ambient temperatures.',
    },
    {
      id: 'inst_flood',
      category: 'FLOOD',
      title: 'Flash Flood & Water Ingress Survival',
      icon: '🌊',
      urgency: 'HIGH',
      steps: [
        'SEEK HIGH GROUND IMMEDIATELY: Move vertically to upper floors or designated elevated terrain.',
        'AVOID WALKING IN MOVING WATER: As little as 15 cm (6 inches) of moving current can sweep an adult off their feet.',
        'TURN AROUND, DON’T DROWN: Never drive across waterlogged bridges or roads (30 cm floats small vehicles).',
        'DISCONNECT POWER: Switch off main electrical breakers if safe to do so before flood waters enter the premises.',
      ],
      doNotList: [
        'DO NOT seek shelter in enclosed attics without a direct roof escape hatch or axe.',
        'DO NOT touch submerged electrical equipment, wires, or appliances.',
        'DO NOT drink flood water (biologically contaminated).',
      ],
      signallingTips: 'Use flashlight strobes or reflective emergency blankets from rooftops.',
      meshTips: 'Store your device in a waterproof zip pouch; mesh wireless signals penetrate plastic enclosures easily.',
    },
    {
      id: 'inst_triage',
      category: 'TRIAGE',
      title: 'Emergency Triage & Bleeding Control',
      icon: '🩹',
      urgency: 'HIGH',
      steps: [
        'CONTROL MASSIVE BLEEDING: Apply direct, continuous, firm pressure with sterile gauze or clean fabric directly on wounds.',
        'TOURNIQUET APPLICATION: For severe arterial limb bleeding, apply tourniquet 5-7 cm above wound, tighten until bleeding ceases, and mark application time.',
        'MAINTAIN OPEN AIRWAY: Tilt head gently back and lift chin for unconscious victims without suspected cervical spine trauma.',
        'PREVENT HYPOTHERMIA: Wrap victims in dry thermal blankets and elevate lower extremities 30 cm if in shock (no spinal fracture).',
      ],
      doNotList: [
        'DO NOT move victims with suspected spinal trauma unless imminent structural collapse threatens life.',
        'DO NOT remove deeply impaled objects (stabilize in place).',
        'DO NOT give food or water to victims awaiting emergency surgery.',
      ],
      signallingTips: 'Report casualty counts and severity tiers accurately via RescuENet Disaster Report form.',
      meshTips: 'Nearby medical posts and shelters are listed on the Safe Zones tab with distance indicators.',
    },
  ];

  static getInstructions(): DisasterInstruction[] {
    return [...this.INSTRUCTIONS];
  }

  static getByCategory(category: DisasterInstruction['category']): DisasterInstruction | undefined {
    return this.INSTRUCTIONS.find(i => i.category === category);
  }
}
