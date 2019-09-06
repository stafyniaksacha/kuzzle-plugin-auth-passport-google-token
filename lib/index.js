/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable require-jsdoc */

const _ = require('lodash')

const StrategyName = 'google-token';
const storageMapping = {
  users: {
    properties: {
      kuid: {
        type: 'keyword',
      },
    },
  },
};

class PluginPassportGoogleoken {
  constructor () {
    this.context = null;
    this.config = {
      strategyCredentials: {
        audiance: [],
      },
      contentMapping: null,
      updateUserCredentials: false,
      identifierAttribute: '',
    };

    this.authenticators = {};
    this.strategies = null;
  }

  getRepository() {
    if (!this.repository) {
      this.repository = new this.context.constructors.Repository(StrategyName);
    }

    return this.repository;
  }

  getCredentialsFromKuid(kuid) {
    return this.getRepository().search({
      query: {
        term: {
          kuid,
        },
      },
    })
      .then(result => {
        if (result.total === 0) {
          return Promise.resolve(null);
        }

        return Promise.resolve(result.hits[0]);
      });
  }

  async init (customConfig, context) {
    for (const requiredOption of [
      'strategyCredentials', 'identifierAttribute',
    ]) {
      if (!Object.prototype.hasOwnProperty.call(
        customConfig,
        requiredOption,
      ) || !customConfig[requiredOption]
      ) {
        console.warn(`[kuzzle-plugin-auth-passport-google-token] Missing "${requiredOption}" plugin option.`);
        return Promise.resolve();
      }
    }

    for (const requiredOption of [
      'audiance',
    ]) {
      if (!Object.prototype.hasOwnProperty.call(
        customConfig.strategyCredentials,
        requiredOption,
      )|| !customConfig.strategyCredentials[requiredOption]
      ) {
        console.warn(`[kuzzle-plugin-auth-passport-google-token] Missing "${requiredOption}" plugin credentials option.`);
        return Promise.resolve();
      }
    }

    this.config = _.defaultsDeep(customConfig, this.config);
    this.context = context;

    await this.context.accessors.storage.bootstrap(storageMapping)

    this.authenticators = {
      GoogleTokenStrategy: require('./passport-google-token'),
    };

    this.strategies = {
      [StrategyName]: {
        config: {
          authenticator: 'GoogleTokenStrategy',
          fields: ['access_token'],
          strategyOptions: this.config.strategyCredentials,
        },
        methods: {
          afterRegister: 'afterRegister', // optional
          create: 'create',
          delete: 'delete',
          exists: 'exists',
          getById: 'getById', // optional
          getInfo: 'getInfo', // optional
          update: 'update',
          validate: 'validate',
          verify: 'verify',
        },
      },

    }
  }

  afterRegister (instanciatedStrategy) {
    console.warn(`[kuzzle-plugin-auth-passport-google-token] strategy loaded.`);
  }

  async create (request, credentials, kuid, strategyName) {
    return this.exists(request, kuid)
      .then(exists => {
        if (exists) {
          return Promise.reject(new this.context.errors.BadRequestError(
            'A strategy already exists for this user.'
          ));
        }
        return this.getRepository().create({
          _id: kuid,
          kuid,
        });
      });
  }

  async delete (request, kuid, strategyName) {
    return this.getCredentialsFromKuid(kuid)
      .then(document => {
        if (document === null) {
          return Promise.reject(new this.context.errors.BadRequestError(
            'A strategy does not exist for this user.'
          ));
        }

        return this.getRepository().delete(document._id, {
          refresh: 'wait_for',
        });
      });
  }

  async exists (request, kuid) {
    return this.getCredentialsFromKuid(kuid)
      .then(credentials => Promise.resolve(credentials !== null));
  }

  async getInfo (request, kuid) {
    return this.getCredentialsFromKuid(kuid)
      .then(info => {
        if (info === null) {
          return Promise.reject(new this.context.errors.BadRequestError(
            'A strategy does not exist for this user.'
          ));
        }

        delete info._id;
        return Promise.resolve(info);
      });
  }

  async getById (request, id) {
    return this.getRepository()
      .get(id)
      .then(result => {
        if (result === null) {
          return Promise.reject(new this.context.errors.BadRequestError(
            'A strategy does not exist for this user.'
          ));
        }

        return Promise.resolve(result);
      });
  }

  async update (request, credentials, kuid) {
    return this.getCredentialsFromKuid(kuid)
      .then(document => {
        if (document === null) {
          return Promise.reject(new this.context.errors.BadRequestError(
            'A strategy does not exist for this user.'
          ));
        }

        return this.getRepository().update(
          Object.assign({
            _id: document._id,
          }, credentials)
        );
      });
  }

  async validate (request, credentials, kuid, strategyName, isUpdate) {
    return this.getRepository()
      .get(kuid)
      .then(result => {
        if (result === null) {
          return Promise.resolve(true);
        }

        if (kuid !== result.kuid) {
          return Promise.reject(new this.context.errors.BadRequestError(
            `Id '${credentials[this.config.identifierAttribute]}' is already used.`
          ));
        }
        return Promise.resolve(true);
      })
      .catch(_ => {
        return Promise.resolve(false);

      })
  }

  async verify (request, googlePayload) {
    if (!Object.prototype.hasOwnProperty.call(
      googlePayload,
      this.config.identifierAttribute,
    )) {
      throw new this.context.errors.NotFoundError(
        `Could not read google "${this.config.identifierAttribute}"`
      );
    }

    return this.getRepository()
      .get(googlePayload[this.config.identifierAttribute])
      .then(userObject => {
        if (userObject !== null) {
          return Promise.resolve({
            kuid: userObject.kuid, message: null,
          });
        }

        throw new this.context.errors.ForbiddenError(
          `Could not login with strategy "${StrategyName}"`
        );
      })
      .catch(err => {
        if (!(err instanceof this.context.errors.NotFoundError)) {
          throw err;
        }

        const userContent = {};

        if (this.config.contentMapping !== null) {
          for (const contentKey in this.config.contentMapping) {
            if (Object.prototype.hasOwnProperty.call(
              this.config.contentMapping,
              contentKey,
            )) {
              _.set(userContent, contentKey, _.get(
                googlePayload,
                this.config.contentMapping[contentKey]
              ));
            }
          }
        }

        const req = {
          controller: 'security',
          action: 'createUser',
          _id: googlePayload[this.config.identifierAttribute],
          body: {
            content: {
              ...userContent,
              profileIds: this.config.defaultProfiles ? this.config.defaultProfiles : ['default'],
            },
            credentials: {
              [StrategyName]: {
                kuid: googlePayload[this.config.identifierAttribute],
              },
            },
          },
        };

        return this.context.accessors.execute(
          new this.context.constructors.Request(
            request.original,
            req,
            {
              refresh: 'wait_for',
            },
          )
        )
          .catch(err => {
            if (!(err instanceof this.context.errors.PreconditionError)) {
              throw err;
            }

            if (!this.config.updateUserCredentials) {
              throw new this.context.errors.ForbiddenError(
                `An account already exist with "${googlePayload[this.config.identifierAttribute]}" identifier`
              );
            }

            const req = {
              controller: 'security',
              action: 'createCredentials',
              _id: googlePayload[this.config.identifierAttribute],
              strategy: StrategyName,
              body: {
                kuid: googlePayload[this.config.identifierAttribute],
              },
            };

            return this.context.accessors.execute(
              new this.context.constructors.Request(
                request.original,
                req,
                {
                  refresh: 'wait_for',
                },
              )
            )
          })
          .then(res => Promise.resolve({
            kuid: res.result._id, message: null,
          }));
      });

  }
}

module.exports = PluginPassportGoogleoken;
