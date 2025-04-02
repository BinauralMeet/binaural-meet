declare module 'fullik' {
  class V3 {
    x: number;
    y: number;
    z: number;

    constructor(x?: number, y?: number, z?: number);
    copy(v: { x: number, y: number, z: number }): this;
    min(v: V3): this;
    add(v: V3): this;
    plus(v: V3): this;
    minus(v: V3): this;
    normalize(): this;
    distanceTo(v: V3): number;
    clone(): V3;
    set(x: number, y: number, z: number): this;
    multiply(v: V3): this;
    multiplyScalar(scalar: number): this;
    cross(v: V3): this;
    dot(v: V3): number;
    length(): number;
    lengthSquared(): number;
    lerp(v: V3, alpha: number): this;
  }

  class Bone3D {
    start: V3;
    end: V3;
    length: number;
    direction: V3;
    worldStart: V3;
    worldEnd: V3;
    worldDirection: V3;
    worldLength: number;

    constructor(start: V3, end: V3);
    init(start: V3, end?: V3, dir?:V3, len?:number): void;
    setStartPosition(position: V3): void;
    setEndPosition(position: V3): void;
    update(): void;
    setLength(length: number): void;
    setDirection(direction: V3): void;
    getWorldStart(): V3;
    getWorldEnd(): V3;
    getWorldDirection(): V3;
    getWorldLength(): number;
  }

  class Joint3D {
    rotorConstraintDegs: number;
    rotorDirection: V3;
    rotorType: string;
    hingeAxis: V3;
    hingeClockwiseDegs: number;
    hingeAnticlockwiseDegs: number;

    constructor();
    setAsBallJoint(degrees: number): void;
    setAsHinge(direction: V3, clockwiseDeg: number, anticlockwiseDeg: number, axis: V3): void;
    setAsGlobalHinge(direction: V3, clockwiseDeg: number, anticlockwiseDeg: number): void;
    setRotorConstraintDegs(degrees: number): void;
    setRotorDirection(direction: V3): void;
    getRotorType(): string;
  }

  class Chain3D {
    bones: Bone3D[];
    joints: Joint3D[];
    numBones: number;
    numJoints: number;
    embeddedTarget?: V3;
    useEmbeddedTarget?: boolean;
    worldTarget: V3;
    isSolved: boolean;
    maxIterations: number;
    tolerance: number;
    isReachable: boolean;
    lastTarget: V3;
    lastSolvedTime: number;
    baseBone: Bone3D | null;
    baseBoneConstraintUV: V3 | null;
    baseLocation: V3 | null;
    lastTargetLocation: V3|null;

    constructor();
    addBone(bone: Bone3D): void;
    addConsecutiveBone(direction: V3, length: number): void;
    addJoint(joint: Joint3D): void;
    solveForTarget(target: V3): void;
    solveForEmbeddedTarget(): void;
    updateChainLength(); void;
    setEmbeddedTarget(target: V3): void;
    setUseEmbeddedTarget(use: boolean): void;
    getWorldTarget(): V3;
    getIsSolved(): boolean;
    clear(): void;
    setMaxIterations(iterations: number): void;
    setTolerance(tolerance: number): void;
    getMaxIterations(): number;
    getTolerance(): number;
    getIsReachable(): boolean;
    getLastTarget(): V3;
    getLastSolvedTime(): number;
    getBone(index: number): Bone3D;
    getJoint(index: number): Joint3D;
    removeBone(index: number): void;
    removeJoint(index: number): void;
    reset(): void;
    setBaseBone(bone: Bone3D): void;
    getBaseBone(): Bone3D | null;
    setBaseBoneConstraintUV(uv: V3): void;
    getBaseBoneConstraintUV(): V3 | null;
    setBaseLocation(location: V3): void;
    getBaseLocation(): V3 | null;
  }

  class Structure3D {
    chains: Chain3D[];
    numChains: number;
    isSolved: boolean;

    constructor();
    add(chain: Chain3D): void;
    update(): void;
    getIsSolved(): boolean;
    clear(): void;
  }

  export const FIK: {
    V3: typeof V3;
    Bone3D: typeof Bone3D;
    Joint3D: typeof Joint3D;
    Chain3D: typeof Chain3D;
    Structure3D: typeof Structure3D;
  };
}
