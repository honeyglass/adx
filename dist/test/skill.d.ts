export type Failure = {
    reason: string;
    next: string;
    findings: string[];
};
/**
 * @param skill - the name the tool gives its skill
 * @param file - samples.skillFile, relative to the working folder of the test
 * @returns why the skill fails, or undefined when it is a skill
 */
export declare function skillFailure(skill: string, file: string | undefined): Failure | undefined;
