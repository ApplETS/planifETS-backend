import { Injectable } from '@nestjs/common';

import { Course } from './Course';
import { FileExtractionService } from './file-extraction.service';
import { Program } from './Program';

@Injectable()
export class CheminotService {
  private readonly programs: Program[] = [];

  constructor(private readonly fileExtractionService: FileExtractionService) {}

  public async parseProgramsAndCoursesCheminot() {
    await this.loadPrograms();
    return this.getPrograms();
  }

  public async loadPrograms() {
    const fileContent =
      await this.fileExtractionService.extractCheminementsFile();
    this.parsePrograms(fileContent);
  }

  private parsePrograms(data: string) {
    const lines = data.split('\n');
    let currentProgram: Program | null = null;
    let skipSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comments
      if (line.startsWith('//')) {
        continue;
      }

      // Handle the start of a new program
      if (Program.isProgramLine(line)) {
        if (currentProgram) {
          // Push the current program before starting a new one
          this.programs.push(currentProgram);
        }
        currentProgram = this.handleProgramLine(line, currentProgram);
        skipSection = false; // Reset skip section when a new program starts
      } else if (this.isSectionToSkip(line)) {
        skipSection = true; // Start skipping section
      } else if (line.startsWith('.HORS-PROGRAMME')) {
        this.handleHorsProgrammeSection(lines, i, currentProgram);
        skipSection = true; // Skip processing after .HORS-PROGRAMME
      } else if (!skipSection && Course.isCourseLine(line) && currentProgram) {
        this.handleCourseLine(line, currentProgram);
      } else if (line.startsWith('.')) {
        skipSection = false; // Reset skip section if a new section starts
      }
    }

    this.addLastProgram(currentProgram);
  }

  private isSectionToSkip(line: string): boolean {
    return (
      line.startsWith('.SIGLES_AVEC_SESSION_ULTIME') ||
      line.startsWith('.PROJETS') ||
      line.startsWith('.PROFILS')
    );
  }

  private handleProgramLine(
    line: string,
    currentProgram: Program | null,
  ): Program | null {
    const program = Program.parseProgramLine(line);
    return program || currentProgram;
  }

  private handleCourseLine(line: string, currentProgram: Program) {
    const course = Course.parseCourseLine(line);
    if (course) {
      currentProgram.addCourse(course);
    }
  }

  private handleHorsProgrammeSection(
    lines: string[],
    startIndex: number,
    currentProgram: Program | null,
  ) {
    if (!currentProgram) return;

    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('.') || !line) {
        break; // Stop when a new section starts or line is empty
      }

      // Skip comments in the HORS-PROGRAMME section
      if (line.startsWith('//')) {
        continue;
      }

      currentProgram.addHorsProgrammeCourse(line);
    }
  }

  private addLastProgram(currentProgram: Program | null) {
    if (currentProgram) {
      this.programs.push(currentProgram);
    }
  }

  public getPrograms(): Program[] {
    return this.programs;
  }
}
