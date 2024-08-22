import { Injectable } from '@nestjs/common';

import { Course } from './Course';
import { FileExtractionService } from './file-extraction.service';
import { Program } from './Program';

@Injectable()
export class CheminotService {
  private programs: Program[] = [];

  constructor(private readonly fileExtractionService: FileExtractionService) {}

  public async loadPrograms() {
    const fileContent =
      await this.fileExtractionService.extractCheminementsFile();
    this.parsePrograms(fileContent);
  }

  private parsePrograms(data: string) {
    const lines = data.split('\n');
    let currentProgram: Program | null = null;

    for (const line of lines) {
      if (line.startsWith('.PROGRAMME')) {
        const program = this.parseProgramLine(line);
        if (program) {
          //TODO: Change this to add all programs
          //if (currentProgram) this.programs.push(currentProgram);
          if (currentProgram?.id === 7084) this.programs.push(currentProgram);
          currentProgram = program;
        }
      } else if (line.startsWith('.COURS')) {
        continue; // Skip the .COURS header
      } else if (currentProgram && line.trim()) {
        const course = this.parseCourseLine(line);
        if (course) {
          currentProgram.addCourse(course);
        }
      }
    }

    //TODO: Change this to add all programs
    //if (currentProgram) this.programs.push(currentProgram);
    if (currentProgram?.id === 7084) this.programs.push(currentProgram);
  }

  private parseProgramLine(line: string): Program | null {
    const regex = /\.PROGRAMME (\d+),.*DEPARTEMENT=(\w+),.*STAGE=(OUI|NON)/;
    const parts = RegExp(regex).exec(line);

    if (!parts) {
      //Program line did not match the expected format
      return null;
    }

    const id = parseInt(parts[1], 10);
    return new Program(id, []);
  }

  private parseCourseLine(line: string): Course | null {
    const parts = line.split(',');
    if (parts.length < 8) {
      //Line does not have the expected number of parts
      return null;
    }

    const type = parts[0]?.trim();
    const session = parseInt(parts[1]?.trim(), 10);
    const code = parts[3]?.trim();
    const profile = parts[4]?.trim();
    const concentration = parts[5]?.trim();
    const category = parts[6]?.trim();
    const level = parts[7]?.trim();
    const mandatory = parts[8]?.trim() === 'B';
    const prerequisites = Course.parsePrerequisites(parts[9]?.trim());

    return new Course(
      type,
      session,
      code,
      profile,
      concentration,
      category,
      level,
      mandatory,
      prerequisites,
    );
  }

  public getPrograms(): Program[] {
    return this.programs;
  }
}
