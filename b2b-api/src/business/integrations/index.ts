export * from './hub';
export { ConnectorRegistryModule, ConnectorRegistryController, ConnectorRegistryService, CredentialVaultService } from './connectors';
export * from './connectors/interfaces';
export {
  RegisterConnectorDto,
  UpdateConnectorRegistrationDto,
  ConfigureConnectorDto,
  UpdateConnectorConfigDto,
  ConnectorConfigQueryDto,
  CreateCredentialDto,
  UpdateCredentialDto,
  CredentialQueryDto,
  RotateCredentialDto,
  DeclareCapabilityDto,
  DeclareCapabilitiesDto,
  ExecuteCapabilityDto,
  ConnectorEventQueryDto,
  ConnectionTestResultDto,
  ConnectorConfigResponseDto,
  CredentialVaultResponseDto,
  CapabilityResponseDto,
} from './connectors/dto';

// REST Connector exports
export {
  RestConnectorModule,
  RestConnectorController,
  RestConnectorService,
  AuthProviderService,
  JsonPathMapperService,
  PaginationHandlerService,
  ErrorMapperService,
  RequestLoggerService,
  WebhookReceiverService,
  GenericRestConnector,
  GenericRestConnectorFactory,
} from './connectors/rest';

// Events (Message Queue) exports
export {
  EventsModule,
  EventPublisherService,
  EventSubscriberService,
  EventLogService,
  EventReplayService,
  WebhookDeliveryService,
  EventProcessor,
  WebhookProcessor,
} from './events';
export * from './events/interfaces';
export {
  PublishEventDto,
  PublishBatchDto,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  EventReplayRequestDto,
  EventLogQueryDto,
  RetentionPolicyDto,
  PublishedEventResponseDto,
  EventStatsResponseDto,
  QueueStatsResponseDto,
  ReplayStatusResponseDto,
} from './events/dto';
