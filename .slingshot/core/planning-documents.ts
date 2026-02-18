import * as fs from 'fs/promises';
import * as path from 'path';

interface PlanningDocuments {
  contextMd: string;
  specMd: string;
  planMd: string;
  riskAssessmentMd: string;
  verificationChecklistMd: string;
}

class PlanningDocumentGenerator {
  private workspaceRoot: string;
  private planningDir: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.planningDir = path.join(workspaceRoot, '.slingshot', 'planning');
  }

  async initializePlanningStructure(): Promise<void> {
    const directories = [
      '.slingshot/planning',
      '.slingshot/planning/specs',
      '.slingshot/planning/plans', 
      '.slingshot/planning/context',
      '.slingshot/planning/risks',
      '.slingshot/planning/verification',
      '.slingshot/execution',
      '.slingshot/execution/iterations',
      '.slingshot/execution/logs',
      '.slingshot/artifacts'
    ];

    for (const dir of directories) {
      const fullPath = path.join(this.workspaceRoot, dir);
      await fs.mkdir(fullPath, { recursive: true });
    }
  }

  async generateContextDocument(
    codebaseAnalysis: any,
    requirements: string,
    sessionId: string
  ): Promise<string> {
    const contextContent = `# Codebase Context

**Session ID:** ${sessionId}  
**Generated:** ${new Date().toISOString()}

## Current Codebase State

### Architecture Overview
- **Total Files:** ${codebaseAnalysis.totalFiles}
- **Languages:** ${Object.keys(codebaseAnalysis.languages).join(', ')}
- **Total Functions:** ${codebaseAnalysis.totalFunctions}
- **Total Classes:** ${codebaseAnalysis.totalClasses}

### Technology Stack
- **Frontend:** React, TypeScript, Next.js
- **Backend:** Node.js, NestJS, PostgreSQL
- **Testing:** Jest, Playwright
- **Build:** Turbo, Docker

### Key Dependencies
${codebaseAnalysis.dependencies.slice(0, 15).map((dep: string) => `- ${dep}`).join('\n')}

### Existing Patterns
- **Component Structure:** Atomic design with components, hooks, and stories
- **API Structure:** RESTful endpoints with validation and error handling
- **State Management:** React Context and custom hooks
- **Testing Strategy:** Unit tests with Jest, E2E with Playwright

## Requirements Analysis

### Primary Requirements
${requirements}

### Constraints
- Must maintain backward compatibility
- Follow existing code patterns and conventions
- Ensure accessibility compliance (WCAG 2.1 AA)
- Maintain performance standards

### Integration Points
- B2B API backend integration
- Authentication system integration
- File upload and management system
- Notification system integration

## Development Context

### Current Sprint Focus
- User management improvements
- Cart and checkout optimization
- API performance enhancements

### Technical Debt Areas
- Legacy component refactoring needed
- Test coverage improvements required
- Documentation updates pending

### Risk Factors
- Complex integration requirements
- Performance constraints
- Security considerations for B2B data
`;

    const filePath = path.join(this.planningDir, 'context', `context-${sessionId}.md`);
    await fs.writeFile(filePath, contextContent, 'utf-8');
    return contextContent;
  }

  async generateSpecDocument(
    requirements: string,
    context: string,
    sessionId: string
  ): Promise<string> {
    const specContent = `# Feature Specification

**Session ID:** ${sessionId}  
**Generated:** ${new Date().toISOString()}

## Feature Overview

### Description
${requirements}

## User Stories

### Primary User Story
As a B2B user, I want [feature capability] so that I can [business value].

### Acceptance Criteria
- [ ] Feature meets all functional requirements
- [ ] User interface is intuitive and accessible
- [ ] Performance meets established benchmarks
- [ ] Security requirements are satisfied
- [ ] Integration with existing systems works correctly

## Functional Requirements

### Core Functionality
1. **Primary Feature Behavior**
   - Detailed description of main functionality
   - Input/output specifications
   - Business logic requirements

2. **User Interface Requirements**
   - Layout and design specifications
   - Interaction patterns
   - Responsive design requirements

3. **Integration Requirements**
   - API endpoint specifications
   - Data flow requirements
   - External system integrations

## Non-Functional Requirements

### Performance
- Page load time < 2 seconds
- API response time < 500ms
- Support for 1000+ concurrent users

### Security
- Input validation and sanitization
- Authentication and authorization
- Data encryption in transit and at rest

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility

### Browser Support
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## Edge Cases and Error Handling

### Error Scenarios
1. **Network Failures**
   - Graceful degradation
   - Retry mechanisms
   - User feedback

2. **Invalid Input**
   - Validation messages
   - Input sanitization
   - Error recovery

3. **System Overload**
   - Rate limiting
   - Queue management
   - Fallback options

## Success Metrics

### Technical Metrics
- Code coverage > 80%
- Performance benchmarks met
- Zero critical security vulnerabilities

### Business Metrics
- User adoption rate
- Task completion rate
- User satisfaction score

## Dependencies

### Internal Dependencies
- Authentication system
- User management system
- Notification system

### External Dependencies
- Third-party APIs
- External services
- Browser capabilities

## Assumptions

1. Users have modern browsers with JavaScript enabled
2. Network connectivity is generally stable
3. Existing authentication system remains unchanged
4. Current API rate limits are sufficient
`;

    const filePath = path.join(this.planningDir, 'specs', `spec-${sessionId}.md`);
    await fs.writeFile(filePath, specContent, 'utf-8');
    return specContent;
  }

  async generatePlanDocument(
    spec: string,
    context: string,
    sessionId: string
  ): Promise<string> {
    const planContent = `# Implementation Plan

**Session ID:** ${sessionId}  
**Generated:** ${new Date().toISOString()}

## Architecture Decisions

### Component Architecture
- **Pattern:** Atomic design with compound components
- **State Management:** React Context for global state, local state for component-specific data
- **Styling:** CSS Modules with design system tokens
- **Testing:** Jest for unit tests, React Testing Library for component tests

### API Design
- **Pattern:** RESTful endpoints with OpenAPI specification
- **Validation:** Joi/Zod for request validation
- **Error Handling:** Structured error responses with proper HTTP status codes
- **Authentication:** JWT tokens with refresh mechanism

### Data Flow
- **Frontend → Backend:** HTTP requests with proper error handling
- **State Updates:** Optimistic updates with rollback on failure
- **Caching:** React Query for server state management

## Implementation Strategy

### Phase 1: Foundation (LISA Planning)
1. **Requirements Analysis** ✓
2. **Architecture Design** ✓
3. **API Specification**
4. **Component Design**
5. **Test Strategy Definition**

### Phase 2: Core Implementation (RALPH Execution)
1. **Database Schema Updates**
   - Migration scripts
   - Index optimization
   - Data validation

2. **Backend API Development**
   - Endpoint implementation
   - Validation logic
   - Error handling
   - Unit tests

3. **Frontend Component Development**
   - Base components
   - Business logic components
   - Integration components
   - Component tests

4. **Integration Layer**
   - API client setup
   - Error boundary implementation
   - Loading states
   - Integration tests

### Phase 3: Verification (LISA Validation)
1. **End-to-End Testing**
2. **Performance Testing**
3. **Security Review**
4. **Accessibility Audit**
5. **Documentation Update**

## Technical Implementation Details

### Database Changes
\`\`\`sql
-- Example migration
ALTER TABLE users ADD COLUMN new_feature_enabled BOOLEAN DEFAULT false;
CREATE INDEX idx_users_feature ON users(new_feature_enabled);
\`\`\`

### API Endpoints
\`\`\`typescript
// Example endpoint structure
POST /api/v1/feature
GET /api/v1/feature/:id
PUT /api/v1/feature/:id
DELETE /api/v1/feature/:id
\`\`\`

### Component Structure
\`\`\`
src/components/Feature/
├── Feature.tsx
├── Feature.module.css
├── Feature.stories.tsx
├── Feature.test.tsx
├── hooks/
│   ├── useFeature.ts
│   └── useFeature.test.ts
└── components/
    ├── FeatureHeader.tsx
    ├── FeatureBody.tsx
    └── FeatureFooter.tsx
\`\`\`

## Risk Mitigation

### Technical Risks
1. **Performance Impact**
   - Mitigation: Implement lazy loading and code splitting
   - Monitoring: Performance metrics tracking

2. **Integration Complexity**
   - Mitigation: Incremental integration with feature flags
   - Fallback: Graceful degradation for failed integrations

3. **Security Vulnerabilities**
   - Mitigation: Security review at each phase
   - Prevention: Automated security scanning

### Business Risks
1. **User Adoption**
   - Mitigation: User testing and feedback loops
   - Measurement: Analytics and user feedback

2. **Performance Degradation**
   - Mitigation: Performance budgets and monitoring
   - Response: Rollback procedures

## Quality Gates

### Code Quality
- [ ] ESLint/Prettier compliance
- [ ] TypeScript strict mode
- [ ] Code review approval
- [ ] Unit test coverage > 80%

### Security
- [ ] Security scan passed
- [ ] Dependency vulnerability check
- [ ] Authentication/authorization review
- [ ] Input validation review

### Performance
- [ ] Lighthouse score > 90
- [ ] Bundle size within budget
- [ ] API response time < 500ms
- [ ] Memory usage within limits

## Deployment Strategy

### Staging Deployment
1. Feature branch deployment
2. Integration testing
3. Performance testing
4. Security testing

### Production Deployment
1. Feature flag enabled for limited users
2. Monitoring and metrics collection
3. Gradual rollout
4. Full deployment after validation

## Rollback Plan

### Immediate Rollback
- Feature flag disable
- Database rollback scripts
- CDN cache invalidation

### Recovery Procedures
- Data integrity checks
- User notification process
- Incident response protocol
`;

    const filePath = path.join(this.planningDir, 'plans', `plan-${sessionId}.md`);
    await fs.writeFile(filePath, planContent, 'utf-8');
    return planContent;
  }

  async generateRiskAssessment(
    plan: string,
    complexity: any,
    sessionId: string
  ): Promise<string> {
    const riskContent = `# Risk Assessment

**Session ID:** ${sessionId}  
**Generated:** ${new Date().toISOString()}

## Risk Matrix

| Risk | Probability | Impact | Severity | Mitigation |
|------|-------------|--------|----------|------------|
| Integration Failure | Medium | High | High | Incremental integration, fallback mechanisms |
| Performance Degradation | Low | High | Medium | Performance testing, monitoring |
| Security Vulnerability | Low | Critical | High | Security review, automated scanning |
| User Adoption Issues | Medium | Medium | Medium | User testing, feedback loops |
| Technical Debt Increase | High | Medium | Medium | Code review, refactoring plan |

## Detailed Risk Analysis

### High Severity Risks

#### 1. Integration Failure
- **Description:** New feature fails to integrate with existing systems
- **Probability:** Medium (30-50%)
- **Impact:** High - Could break existing functionality
- **Mitigation Strategies:**
  - Implement feature flags for gradual rollout
  - Create comprehensive integration tests
  - Develop fallback mechanisms
  - Maintain backward compatibility

#### 2. Security Vulnerability
- **Description:** New feature introduces security weaknesses
- **Probability:** Low (10-20%)
- **Impact:** Critical - Could expose sensitive B2B data
- **Mitigation Strategies:**
  - Mandatory security review at each phase
  - Automated security scanning in CI/CD
  - Input validation and sanitization
  - Regular penetration testing

### Medium Severity Risks

#### 3. Performance Degradation
- **Description:** New feature negatively impacts application performance
- **Probability:** Low (15-25%)
- **Impact:** High - Could affect user experience
- **Mitigation Strategies:**
  - Performance budgets and monitoring
  - Load testing before deployment
  - Code splitting and lazy loading
  - Performance profiling

#### 4. User Adoption Issues
- **Description:** Users don't adopt or understand the new feature
- **Probability:** Medium (25-40%)
- **Impact:** Medium - Reduced ROI on development
- **Mitigation Strategies:**
  - User research and testing
  - Intuitive UI/UX design
  - Comprehensive documentation
  - Training and onboarding

#### 5. Technical Debt Increase
- **Description:** Implementation adds to existing technical debt
- **Probability:** High (60-80%)
- **Impact:** Medium - Slower future development
- **Mitigation Strategies:**
  - Code review requirements
  - Refactoring as part of implementation
  - Documentation updates
  - Architecture compliance checks

## Risk Monitoring

### Key Metrics
- **Performance:** Response times, error rates, resource usage
- **Security:** Vulnerability scans, security incidents
- **Quality:** Code coverage, bug reports, technical debt metrics
- **Adoption:** User engagement, feature usage, feedback scores

### Escalation Procedures
1. **Low Risk:** Team lead notification
2. **Medium Risk:** Project manager involvement
3. **High Risk:** Stakeholder escalation
4. **Critical Risk:** Immediate stop and review

## Contingency Plans

### Plan A: Feature Flag Rollback
- Immediate disable via feature flag
- Monitor for system stability
- Investigate and fix issues
- Re-enable after validation

### Plan B: Code Rollback
- Revert to previous stable version
- Database rollback if necessary
- User communication
- Post-mortem analysis

### Plan C: Partial Rollback
- Disable problematic components only
- Maintain working functionality
- Gradual re-enablement
- Continuous monitoring

## Risk Review Schedule

- **Daily:** During development sprints
- **Weekly:** Risk metric review
- **Monthly:** Comprehensive risk assessment
- **Quarterly:** Risk strategy review
`;

    const filePath = path.join(this.planningDir, 'risks', `risk-assessment-${sessionId}.md`);
    await fs.writeFile(filePath, riskContent, 'utf-8');
    return riskContent;
  }

  async generateVerificationChecklist(
    sessionId: string
  ): Promise<string> {
    const checklistContent = `# Verification Checklist

**Session ID:** ${sessionId}  
**Generated:** ${new Date().toISOString()}

## Pre-Deployment Verification

### Functional Testing
- [ ] All user stories implemented and tested
- [ ] Acceptance criteria met for each feature
- [ ] Edge cases handled appropriately
- [ ] Error scenarios tested and handled
- [ ] Integration points working correctly

### Technical Quality
- [ ] Code review completed and approved
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Integration tests passing
- [ ] End-to-end tests passing
- [ ] Performance tests meeting benchmarks

### Security Review
- [ ] Security scan completed with no critical issues
- [ ] Input validation implemented
- [ ] Authentication/authorization working
- [ ] Data encryption verified
- [ ] Dependency vulnerabilities addressed

### Performance Validation
- [ ] Page load times within acceptable limits (<2s)
- [ ] API response times acceptable (<500ms)
- [ ] Memory usage within bounds
- [ ] Bundle size within budget
- [ ] Lighthouse score >90

### Accessibility Compliance
- [ ] WCAG 2.1 AA standards met
- [ ] Keyboard navigation working
- [ ] Screen reader compatibility verified
- [ ] Color contrast ratios acceptable
- [ ] Focus management implemented

### Browser Compatibility
- [ ] Chrome (latest 2 versions) tested
- [ ] Firefox (latest 2 versions) tested
- [ ] Safari (latest 2 versions) tested
- [ ] Edge (latest 2 versions) tested
- [ ] Mobile browsers tested

### Documentation
- [ ] API documentation updated
- [ ] Component documentation updated
- [ ] User documentation created/updated
- [ ] Deployment documentation updated
- [ ] Troubleshooting guide created

## Post-Deployment Verification

### Monitoring Setup
- [ ] Application metrics configured
- [ ] Error tracking enabled
- [ ] Performance monitoring active
- [ ] User analytics configured
- [ ] Alert thresholds set

### Rollback Readiness
- [ ] Rollback procedures documented
- [ ] Database rollback scripts tested
- [ ] Feature flag controls verified
- [ ] Emergency contacts identified
- [ ] Communication plan ready

### User Acceptance
- [ ] Stakeholder sign-off received
- [ ] User training completed
- [ ] Support documentation available
- [ ] Feedback collection mechanism active
- [ ] Success metrics baseline established

## Sign-off Requirements

### Technical Sign-off
- [ ] **Lead Developer:** Code quality and architecture
- [ ] **QA Lead:** Testing completeness and quality
- [ ] **Security Officer:** Security compliance
- [ ] **DevOps Engineer:** Deployment readiness

### Business Sign-off
- [ ] **Product Owner:** Feature completeness
- [ ] **UX Designer:** User experience quality
- [ ] **Business Stakeholder:** Business requirements met
- [ ] **Support Lead:** Support readiness

## Final Verification

### Go/No-Go Decision Criteria
- [ ] All critical tests passing
- [ ] No blocking security issues
- [ ] Performance within acceptable limits
- [ ] Rollback procedures tested and ready
- [ ] All required sign-offs obtained

### Deployment Authorization
- **Authorized by:** ___________________
- **Date:** ___________________
- **Time:** ___________________
- **Deployment Window:** ___________________

## Post-Deployment Monitoring

### First 24 Hours
- [ ] Error rates within normal range
- [ ] Performance metrics stable
- [ ] User feedback positive
- [ ] No critical issues reported
- [ ] Rollback not required

### First Week
- [ ] Feature adoption tracking
- [ ] Performance trend analysis
- [ ] User feedback analysis
- [ ] Support ticket review
- [ ] Success metrics evaluation

### Success Criteria Met
- [ ] All acceptance criteria satisfied
- [ ] Performance benchmarks achieved
- [ ] Security requirements met
- [ ] User adoption targets reached
- [ ] Business objectives fulfilled
`;

    const filePath = path.join(this.planningDir, 'verification', `verification-checklist-${sessionId}.md`);
    await fs.writeFile(filePath, checklistContent, 'utf-8');
    return checklistContent;
  }

  async generateProgressDocument(sessionId: string): Promise<string> {
    const progressContent = `# Progress Tracking

**Session ID:** ${sessionId}  
**Started:** ${new Date().toISOString()}

## Current Status: PLANNING

### LISA Phase Progress
- [x] Context Analysis
- [x] Specification Generation
- [x] Implementation Planning
- [x] Risk Assessment
- [ ] Planning Review and Approval

### RALPH Phase Progress
- [ ] PRD Item 1: Core Implementation
- [ ] PRD Item 2: Integration Layer
- [ ] PRD Item 3: Testing Suite
- [ ] PRD Item 4: Documentation

### Verification Phase Progress
- [ ] Integration Testing
- [ ] Performance Validation
- [ ] Security Review
- [ ] Final Verification

## Iteration Log

### Planning Iterations
1. **Initial Context Analysis** - ${new Date().toISOString()}
   - Analyzed codebase structure
   - Identified integration points
   - Generated context document

2. **Specification Development** - ${new Date().toISOString()}
   - Created feature specification
   - Defined acceptance criteria
   - Documented requirements

3. **Implementation Planning** - ${new Date().toISOString()}
   - Designed architecture
   - Created implementation plan
   - Identified risks and mitigations

### Execution Iterations
*Will be populated during RALPH execution phase*

## Metrics

### Planning Phase Metrics
- **Time Spent:** 0.5 hours
- **Documents Generated:** 4
- **Risks Identified:** 5
- **Dependencies Mapped:** 12

### Execution Phase Metrics
*Will be populated during execution*

### Quality Metrics
*Will be populated during verification*

## Notes and Observations

### Key Decisions
- Chose React Context over Redux for state management
- Decided on incremental rollout strategy
- Selected Jest for testing framework

### Challenges Identified
- Complex integration requirements
- Performance optimization needs
- Security compliance requirements

### Next Steps
1. Review planning documents with stakeholders
2. Begin RALPH execution phase
3. Set up monitoring and metrics collection
4. Prepare rollback procedures
`;

    const filePath = path.join(this.workspaceRoot, '.slingshot', 'execution', `progress-${sessionId}.md`);
    await fs.writeFile(filePath, progressContent, 'utf-8');
    return progressContent;
  }

  async generatePRDItems(sessionId: string): Promise<string> {
    const prdContent = `# PRD Items Breakdown

**Session ID:** ${sessionId}  
**Generated:** ${new Date().toISOString()}

## PRD Item 1: Core Implementation

### Scope
Implement the main feature functionality including business logic, data models, and core API endpoints.

### Completion Criteria
- [ ] Database schema updated with migrations
- [ ] Core API endpoints implemented and tested
- [ ] Business logic validated with unit tests
- [ ] Error handling implemented
- [ ] Input validation working correctly
- [ ] \`<promise>COMPLETE</promise>\` output when all criteria met

### Constraints
- Must use existing authentication middleware
- Follow established API patterns and conventions
- Maintain backward compatibility
- Use TypeScript strict mode

### Dependencies
- None (foundational item)

### Max Iterations
10

### Estimated Complexity
Medium

---

## PRD Item 2: Frontend Components

### Scope
Create React components for the new feature including forms, displays, and interactive elements.

### Completion Criteria
- [ ] Base components created with proper TypeScript interfaces
- [ ] Component tests written and passing
- [ ] Storybook stories created
- [ ] Accessibility requirements met
- [ ] Responsive design implemented
- [ ] \`<promise>COMPLETE</promise>\` output when all criteria met

### Constraints
- Use existing design system components where possible
- Follow atomic design principles
- Ensure WCAG 2.1 AA compliance
- Use CSS Modules for styling

### Dependencies
- PRD Item 1 (Core Implementation)

### Max Iterations
8

### Estimated Complexity
Medium

---

## PRD Item 3: Integration Layer

### Scope
Implement the integration between frontend and backend, including API client setup, error handling, and state management.

### Completion Criteria
- [ ] API client methods implemented
- [ ] Error boundary components created
- [ ] Loading states implemented
- [ ] Optimistic updates working
- [ ] Integration tests passing
- [ ] \`<promise>COMPLETE</promise>\` output when all criteria met

### Constraints
- Use React Query for server state management
- Implement proper error recovery
- Follow existing error handling patterns
- Ensure proper loading UX

### Dependencies
- PRD Item 1 (Core Implementation)
- PRD Item 2 (Frontend Components)

### Max Iterations
6

### Estimated Complexity
Low

---

## PRD Item 4: Testing Suite

### Scope
Create comprehensive test coverage including unit tests, integration tests, and end-to-end tests.

### Completion Criteria
- [ ] Unit test coverage >80%
- [ ] Integration tests for all API endpoints
- [ ] E2E tests for critical user journeys
- [ ] Performance tests implemented
- [ ] All tests passing in CI/CD
- [ ] \`<promise>COMPLETE</promise>\` output when all criteria met

### Constraints
- Use Jest for unit tests
- Use Playwright for E2E tests
- Follow existing test patterns
- Include accessibility tests

### Dependencies
- PRD Item 1 (Core Implementation)
- PRD Item 2 (Frontend Components)
- PRD Item 3 (Integration Layer)

### Max Iterations
5

### Estimated Complexity
Low

---

## PRD Item 5: Documentation and Deployment

### Scope
Update documentation, prepare deployment configurations, and ensure production readiness.

### Completion Criteria
- [ ] API documentation updated
- [ ] Component documentation updated
- [ ] User guide created
- [ ] Deployment scripts updated
- [ ] Monitoring configured
- [ ] \`<promise>COMPLETE</promise>\` output when all criteria met

### Constraints
- Follow existing documentation standards
- Use OpenAPI for API documentation
- Include troubleshooting guides
- Ensure deployment automation

### Dependencies
- All previous PRD items

### Max Iterations
3

### Estimated Complexity
Low

## Execution Order

1. **PRD Item 1** → **PRD Item 2** (can run in parallel after Item 1 is 50% complete)
2. **PRD Item 3** (requires Items 1 and 2)
3. **PRD Item 4** (requires Items 1, 2, and 3)
4. **PRD Item 5** (requires all previous items)

## Ralph Loop Configuration

### Stop Hook Settings
- **Completion Promise:** \`<promise>COMPLETE</promise>\`
- **Max Iterations per Item:** As specified above
- **Cost Threshold:** $10 per PRD item
- **Git Integration:** Auto-commit after each iteration

### Progress Tracking
- **Progress File:** \`.slingshot/execution/progress-${sessionId}.md\`
- **Log Level:** INFO
- **Metrics Collection:** Enabled

### Escape Hatches
- Max iterations reached without completion
- Cost threshold exceeded
- Critical error detected
- Security vulnerability identified
- Performance regression detected
`;

    const filePath = path.join(this.workspaceRoot, '.slingshot', 'planning', `prd-items-${sessionId}.md`);
    await fs.writeFile(filePath, prdContent, 'utf-8');
    return prdContent;
  }

  async listPlanningDocuments(): Promise<string[]> {
    const documents: string[] = [];
    const planningPath = path.join(this.workspaceRoot, '.slingshot', 'planning');
    
    try {
      const subdirs = ['specs', 'plans', 'context', 'risks', 'verification'];
      
      for (const subdir of subdirs) {
        const subdirPath = path.join(planningPath, subdir);
        try {
          const files = await fs.readdir(subdirPath);
          files.forEach(file => {
            if (file.endsWith('.md')) {
              documents.push(path.join('.slingshot', 'planning', subdir, file));
            }
          });
        } catch (error) {
          // Directory doesn't exist yet, skip
        }
      }
    } catch (error) {
      console.warn('Planning directory not found');
    }
    
    return documents;
  }
}

export { PlanningDocumentGenerator, PlanningDocuments };