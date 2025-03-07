import { Hex, decodeAbiParameters } from "viem";
import { PaymasterInfo, PaymasterInfoExtended, PaymasterProvider, PaymasterType, UserOperation } from "../../../types";
import { IPaymaster, PaymasterInfoParams } from "../interface";
import { EntryPointFactory } from "../../entryPoint/factory";
import { IEntryPointService } from "../../entryPoint/interface/IEntryPointService";

export class BiconomySponsorshipPaymasterV1_1_0 implements IPaymaster {

    name: string;
    address: string;
    type: PaymasterType;
    provider: PaymasterProvider;
    entryPointAddress: string;
    entryPointService: IEntryPointService;
    version: string;
    
    constructor(config: PaymasterInfoExtended) {
        this.name = config.name;
        this.address = config.paymasterAddress;
        this.type = config.type;
        this.provider = config.provider;
        this.entryPointAddress = config.entryPointAddress;
        this.entryPointService = EntryPointFactory.getEntryPointService(this.entryPointAddress);
        this.version = config.version;
    }

    async canHandleUserOp(userOp: UserOperation): Promise<boolean> {
        try {
            let paymasterAddressFromUserOp = this.entryPointService.getPaymasterAddress(userOp);
            if (paymasterAddressFromUserOp === this.address) {
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error in canHandleUserOp:", error);
            return false; // or handle error as appropriate for your system
        }
    }

    async getPaymasterInfo(param: PaymasterInfoParams): Promise<PaymasterInfo> {
        let { networkId: _networkId, userOp: _userOp } = param;
        let paymasterInfo: PaymasterInfo = {
            name: this.name,
            provider: this.provider,
            paymasterAddress: this.entryPointService.getPaymasterAddress(_userOp),
            type: this.type,
            version: this.version
        };
        
        // Extract more data from paymasterAndData as per Biconomy Sponsorship Paymaster v1.1.0
        if (_userOp.paymasterAndData) {
            const decoded = decodeAbiParameters(
                [
                    { name: 'paymasterId', type: 'address' },
                    { name: 'validUntil', type: 'uint48' },
                    { name: 'validAfter', type: 'uint48' },
                    { name: 'signature', type: 'bytes' },
                ],
                this.entryPointService.getPaymasterData(_userOp) as Hex
            );
            console.debug("Decoded paymasterData:", decoded);
            paymasterInfo = {
                ...paymasterInfo,
                moreInfo: {
                    paymasterId: decoded[0],
                    validUntil: decoded[1],
                    validAfter: decoded[2],
                    signature: decoded[3],
                }
            };
        }
        return paymasterInfo;
    }

    // Private methods
}