## Copy of the file for reference
# Cheminot text file

This file contains informations about the programs and courses.

The file is embedded in the **ChemiNotC.jar** archive, which is extracted from the ChemiNot application.

### Source

- **URL**: `https://CheminotJWS.etsmtl.ca/ChemiNotC.jar`
- **Location in JAR**: `ressources/Cheminements.txt`

### Usage in our system

- Establish course sequences (`typicalSessionIndex`) and prerequisites

### Programs
```txt
// .PROGRAMME 7883,STAGE=OUI,SEUILCONC=nnn,CONCOBLIGATOIRE=OUI,DEPARTEMENT=E
//   Cette balise indique le début de la définition d'un programme.
//   STAGE=OUI indique qu'il s'agit d'un programme avec stage.
//             FACULTATIF.  Par défaut: NON.
//   CONCOBLIGATOIRE=OUI indique qu'au moins un cours de concentration
//                       FACULTATIF
//   SEUILCONC=nnn indique le nombre de crédits minimum à réussir avant
//                 que l'étudiant puisse s'inscrire à des cours de
//                 concentration optionnels.
//                 FACULTATIF
//   DEPARTEMENT=d indique le département aux fins de garantir
//                 l'exclusivité départementale lors de l'inscription.
//                 FACULTATIF.
//---------------------
// .PROFILS
//   Cette balise indique que les lignes suivantes contiennent la
//   définition des différents profils d'accueil associé à ce programme.
//   Chacune des lignes est composée de 3 champs: le code de profil,
//   le titre abrégé et le titre complet du profil.
//   Il doit au moins exister un profil par programme, le profil T
//   pour TOUS.
//---------------------
// .CONCENTRATIONS
//   Cette balise indique que les lignes suivantes contiennent la
//   définition des différentes concentrations possibles pour ce
//   programme.  Même structure que pour les profils.
//   Il doit exister au moins une concentration par programme,
//   la concentration TC pour Tronc Commun.
//---------------------
```

Courses 
```
// .COURS
//
// Pour les programme de premier cycle:
//
// Cette balise indique que les lignes suivantes contiennent
// le Détail des cheminements des programmes
// TRONC,4, 4,GCI350,T, E, C,C,B,CTN105,GPO601 GPO651
//   |   |  |  |     |  |  | | |  |     |
//   |   |  |  |     |  |  | | |  |     Cours au choix pour type CHOIX
//   |   |  |  |     |  |  | | |  Liste des prérequis
//   |   |  |  |     |  |  | | Oblig (B). ou optionnel (O)
//   |   |  |  |     |  |  | Niveau (Bac, Cert. Maît, Préalable)
//   |   |  |  |     |  |  Nature (Synthèse, Cours, sTage, Atelier)
//   |   |  |  |     |  Concentration (doit exister dans la section .CONCENTRATIONS)
//   |   |  |  |     Profil d'accueil (doit exister dans la section .PROFILS)
//   |   |  |  Sigle du cours
//   |   |  Ligne dans le graphique (1 à 21)
//   |   Session (colonne) dans le graphique (1 à 8)
//   Type : TRONC, CHOIX (déroulant), STAGE, CONCE (concentration), PROFI (profil d'accueil)
//
// Dans les préalables, si une lettre minuscule en début de sigle demande à
// l'engin graphique d'essayer de tracer la ligne de préalable le plus à gauche possible.
// Si la minuscule est au troisième caractère du sigle, on demande à l'engin
// graphique de tracer la ligne de préalable le plus à droite possible.
// Pour les programmes d'études avancées:
// Simplement la liste des cours, séparés par des virgules, qui composent le programme
//---------------------
// .HORS-PROGRAMME
//  Cette balise indique que les lignes suivantes contiennent la liste
//  des cours hors-programme auxquels l'étudiant est autorisé à
//  s'inscrire pour ce programme d'études.
//  Deux champ sont requis: le sigle et ses préalables.
//
//----------------------
// .PROJETS
// Cette balise, présente aux études avancées seulement, décrit les types de projets
// disponibles pour chaque programme.
//
// 12, 3, 12, ACTIVIT, SYS960,PRJ003,PRJ006
//  |  |   |    |      |
//  |  |   |    |      Les sigles faisant partie du projet (et cumulant des crédits)
//  |  |   |    Sigle de poursuite du projet quand crédits tous suivis
//  |  |   Nb de crédits total du projet
//  |  No de la session max pour s'inscrire au projet
//  Profil d'accueil identifiant le projet
//
//------------------------
// .CLONE
// Cette balise indique à ChemiNot de faire un clone, une copie identique,
// du programme courant vers un autre programme dont la structure est la
// même.  Par exemple, pour la bidiplômante, les programmes 7185 et 7285
// sont des clones de 7885.
//.CLONE
//7185,7285
// De plus, aux études supérieures, on peut créer des clones de programmes
// quand un DESS a les mêmes caractéristiques qu'une maîtrise, à l'exception
// du projet d'application.
//
//--------------------------
```

Explanation of prerequisites
```

// INF125 - I : avoir réussi INF125 sauf si est dans le profil I
// MAT135 & MAT125 : avoir réussi ces deux cours (en bleu)
// (GPA205 - P) & GPA430 : avoir réussi GPA430 ET avoir réussi GPA205 sauf si dans le profil P
// >= 50 : avoir cumulé un minimum de 50 crédits
// (QUA120 | QUA122) : un OU l'autre (en jaune)
//  >= 18 (QUA120 | QUA122) & QUA141 & QUA133 : C'est possible
// (@ MAT135) : cours concomittant (en rouge)
// (GPA305 ? E ! )
// (GPA305 ? E ! ING120)
//
```


### Copy of the file `Cheminements.txt`

In this folder, you will find a copy of the file Cheminot for reference.
Date: 2024-08-22
