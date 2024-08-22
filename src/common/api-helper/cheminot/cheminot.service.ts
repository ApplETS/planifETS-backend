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

    lines.forEach((line) => {
      if (Program.isProgramLine(line)) {
        currentProgram = this.handleProgramLine(line, currentProgram);
      } else if (Course.isCourseLine(line) && currentProgram) {
        this.handleCourseLine(line, currentProgram);
      }
    });

    this.addLastProgram(currentProgram);
  }

  private handleProgramLine(
    line: string,
    currentProgram: Program | null,
  ): Program | null {
    const program = Program.parseProgramLine(line);
    if (program && currentProgram) {
      this.programs.push(currentProgram);
    }
    return program || currentProgram;
  }

  private handleCourseLine(line: string, currentProgram: Program) {
    const course = Course.parseCourseLine(line);
    if (course) {
      currentProgram.addCourse(course);
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
