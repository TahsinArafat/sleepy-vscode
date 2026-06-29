// kilocode_change - new file
import { Config } from "@/config/config"
import { Auth } from "@/auth"
import { ModelCache } from "./model-cache"
import * as Core from "@opencode-ai/core/models-dev"
import { Context, Effect, Layer } from "effect"
import { AI_SDK_PROVIDERS, PROMPTS } from "@kilocode/kilo-gateway"
import { overlay } from "@/kilocode/anaconda-desktop/provider"

export const Model = Core.Model
export type Model = Core.Model
export const Provider = Core.Provider
export type Provider = Core.Provider
export const CatalogModelStatus = Core.CatalogModelStatus
export type CatalogModelStatus = Core.CatalogModelStatus

export interface Interface extends Core.Interface {}

export class Service extends Context.Service<Service, Interface>()("@opencode/ModelsDev") {}

export const layer: Layer.Layer<Service, never, Core.Service | Config.Service | Auth.Service | ModelCache.Service> =
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const core = yield* Core.Service
      const config = yield* Config.Service
      const auth = yield* Auth.Service
      const cache = yield* ModelCache.Service

      const get = Effect.fn("ModelsDev.get")(function* () {
        const providers = overlay(yield* core.get())

        const cfg = yield* config.get()
        const apt = cfg.provider?.apertis?.options
        const aptURL = apt?.baseURL ?? "https://api.apertis.ai/v1"
        const aptOpts = apt?.baseURL ? { baseURL: apt.baseURL } : {}

        const addApertis = Effect.fnUntraced(function* () {
          if (providers.apertis) return
          const models = yield* cache.fetch("apertis", aptOpts).pipe(Effect.catch(() => Effect.succeed({})))
          providers.apertis = {
            id: "apertis",
            name: "Apertis",
            env: ["APERTIS_API_KEY"],
            api: aptURL,
            npm: "@ai-sdk/openai-compatible",
            models,
          }
          if (Object.keys(models).length === 0)
            yield* cache.refresh("apertis", aptOpts).pipe(Effect.ignore, Effect.forkDetach)
        })

        yield* addApertis()

        // sleepy_change start — register Sleepy Code provider
        const sleepyInfo = yield* auth.get("sleepy").pipe(Effect.catch(() => Effect.succeed(undefined)))
        const sleepyTokenFromAuth = sleepyInfo?.type === "api" ? sleepyInfo.key : undefined
        const sleepyToken = sleepyTokenFromAuth ?? process.env.SLEEPY_ACCESS_TOKEN
        const sleepyOpts = cfg.provider?.sleepy?.options
        const sleepyURL = sleepyOpts?.baseURL ?? process.env.SLEEPY_API_URL ?? "http://localhost:3000"
        const token = sleepyToken ?? sleepyOpts?.apiKey

          // Fetch models from the Sleepy API
        const sleepyModels: Record<string, any> = yield* Effect.promise(async () => {
          const res = await globalThis.fetch(`${sleepyURL}/api/models`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
          if (!res.ok) return {}
          const raw = await res.json() as Array<{ modelId: string; name: string; omniRouteModelId: string }>
          const result: Record<string, any> = {}
          for (const m of raw) {
            result[m.modelId] = {
              id: m.omniRouteModelId,
              name: m.name,
              provider: { npm: "@sleepy/sleepy-gateway" },
            }
          }
          return result
        }).pipe(Effect.catch(() => Effect.succeed({})))

        providers.sleepy = {
          id: "sleepy",
          name: "Sleepy Code",
          env: ["SLEEPY_ACCESS_TOKEN"],
          api: `${sleepyURL}/api/v1`,
          npm: "@sleepy/sleepy-gateway",
          models: sleepyModels,
        }
        // sleepy_change end

        return providers
      })

      return Service.of({ get, refresh: core.refresh })
    }),
  )

export const defaultLayer = layer.pipe(
  Layer.provide(Core.defaultLayer),
  Layer.provide(Config.defaultLayer),
  Layer.provide(Auth.defaultLayer),
  Layer.provide(ModelCache.defaultLayer),
)

export { AI_SDK_PROVIDERS, PROMPTS }
export * as ModelsDev from "./models"
