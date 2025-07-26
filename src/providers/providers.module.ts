import { Module } from '@nestjs/common';
import { ProvidersFactory } from './providers.factory';

// TODO: Import provider implementations when they're created
// import { RegulaService } from './regula/regula.service';
// import { PersonaService } from './persona/persona.service';

@Module({
  providers: [
    ProvidersFactory,
    // TODO: Add provider implementations here when created
    // RegulaService,
    // PersonaService,
  ],
  exports: [ProvidersFactory],
})
export class ProvidersModule {
  constructor(private readonly providersFactory: ProvidersFactory) {
    // TODO: Register providers when they're implemented
    // this.registerProviders();
  }

  // TODO: Implement provider registration when providers are created
  // private registerProviders(): void {
  //   // Register Regula provider
  //   const regulaProvider = this.moduleRef.get(RegulaService);
  //   this.providersFactory.registerProvider(regulaProvider, {
  //     name: 'regula',
  //     displayName: 'Regula ForensicsSDK',
  //     version: '1.0.0',
  //     description: 'Document verification and forensic analysis',
  //     website: 'https://regulaforensics.com',
  //     capabilities: {
  //       supportsDocumentVerification: true,
  //       supportsBiometricVerification: true,
  //       supportsLivenessDetection: true,
  //       supportedDocumentTypes: ['passport', 'id_card', 'driver_license'],
  //       supportedCountries: ['US', 'EU', 'GLOBAL'],
  //       maxFileSize: 10 * 1024 * 1024,
  //       supportedImageFormats: ['jpeg', 'png', 'pdf'],
  //     },
  //   });
  // }
}
